-- Constraints & triggers that Prisma's schema language cannot express.
-- Everything here guards data integrity at the database level, independent of API code.

-- ─── Shared helpers ─────────────────────────────────────────────────────────

CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- User performing the current change, set per transaction with
--   SELECT set_config('jobtok.actor_id', '<uuid>', true);
CREATE FUNCTION current_actor_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('jobtok.actor_id', true), '')::uuid
$$;

-- ─── countries / categories / skills ────────────────────────────────────────

ALTER TABLE countries
  ADD CONSTRAINT countries_code_format CHECK (code ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT countries_currency_code_format CHECK (currency_code ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT countries_dial_code_format CHECK (dial_code ~ '^\+[0-9]{1,4}$');

ALTER TABLE categories
  ADD CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ADD CONSTRAINT categories_name_not_blank CHECK (btrim(name) <> '');

ALTER TABLE skills
  ADD CONSTRAINT skills_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ADD CONSTRAINT skills_name_not_blank CHECK (btrim(name) <> '');

-- ─── users ──────────────────────────────────────────────────────────────────

ALTER TABLE users
  ADD CONSTRAINT users_phone_e164 CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
  ADD CONSTRAINT users_email_format CHECK (
    email IS NULL OR (email = lower(email) AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
  ),
  -- A user may only act in a mode their role allows. Switching modes means moving to
  -- role 'both'; profiles are never deleted by a switch.
  ADD CONSTRAINT users_active_mode_matches_role CHECK (
    role IN ('both', 'admin') OR active_mode::text = role::text
  ),
  ADD CONSTRAINT users_suspension_reason_required CHECK (
    NOT is_suspended OR suspension_reason IS NOT NULL
  );

-- Phone must match the user's country configuration; new sign-ups need an enabled country.
CREATE FUNCTION users_validate_country_phone() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  c countries%ROWTYPE;
BEGIN
  SELECT * INTO c FROM countries WHERE code = NEW.country_code;
  IF TG_OP = 'INSERT' AND NOT c.is_enabled THEN
    RAISE EXCEPTION 'users_country_enabled: Country % is not enabled for sign-up', NEW.country_code
      USING ERRCODE = 'check_violation', CONSTRAINT = 'users_country_enabled';
  END IF;
  IF left(NEW.phone, length(c.dial_code)) <> c.dial_code
     OR substr(NEW.phone, length(c.dial_code) + 1) !~ c.phone_pattern THEN
    RAISE EXCEPTION 'users_phone_matches_country: Phone % is not valid for country %', NEW.phone, NEW.country_code
      USING ERRCODE = 'check_violation', CONSTRAINT = 'users_phone_matches_country';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER users_validate_country_phone
  BEFORE INSERT OR UPDATE OF phone, country_code ON users
  FOR EACH ROW EXECUTE FUNCTION users_validate_country_phone();

-- Non-destructive role switching: a role cannot drop a capability the user already has.
CREATE FUNCTION users_protect_capabilities() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role = 'seeker' AND EXISTS (SELECT 1 FROM employer_profiles WHERE user_id = NEW.id) THEN
    RAISE EXCEPTION 'users_role_keeps_capabilities: User % has an employer profile; role cannot become seeker-only', NEW.id
      USING ERRCODE = 'check_violation', CONSTRAINT = 'users_role_keeps_capabilities';
  END IF;
  IF NEW.role = 'employer' AND EXISTS (SELECT 1 FROM profiles WHERE user_id = NEW.id) THEN
    RAISE EXCEPTION 'users_role_keeps_capabilities: User % has a job seeker profile; role cannot become employer-only', NEW.id
      USING ERRCODE = 'check_violation', CONSTRAINT = 'users_role_keeps_capabilities';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER users_protect_capabilities
  BEFORE UPDATE OF role ON users
  FOR EACH ROW WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION users_protect_capabilities();

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── profiles / employer_profiles ───────────────────────────────────────────

ALTER TABLE profiles
  ADD CONSTRAINT profiles_username_format CHECK (username ~ '^[a-z0-9_.]{3,30}$'),
  ADD CONSTRAINT profiles_experience_years_range CHECK (experience_years BETWEEN 0 AND 80),
  ADD CONSTRAINT profiles_latitude_range CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT profiles_longitude_range CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  ADD CONSTRAINT profiles_avatar_url_format CHECK (avatar_url IS NULL OR avatar_url ~ '^https?://');

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE employer_profiles
  ADD CONSTRAINT employer_profiles_logo_url_format CHECK (company_logo_url IS NULL OR company_logo_url ~ '^https?://'),
  ADD CONSTRAINT employer_profiles_website_format CHECK (website IS NULL OR website ~ '^https?://');

-- ─── posts / portfolio ──────────────────────────────────────────────────────

-- Media lives in object storage: only http(s) references are accepted, never inline data.
ALTER TABLE posts
  ADD CONSTRAINT posts_video_duration_range CHECK (
    video_duration_seconds IS NULL OR video_duration_seconds BETWEEN 1 AND 60
  ),
  ADD CONSTRAINT posts_video_url_format CHECK (video_url IS NULL OR video_url ~ '^https?://'),
  ADD CONSTRAINT posts_thumbnail_url_format CHECK (
    video_thumbnail_url IS NULL OR video_thumbnail_url ~ '^https?://'
  ),
  ADD CONSTRAINT posts_flag_count_non_negative CHECK (flag_count >= 0);

CREATE TRIGGER posts_set_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE portfolio_items
  ADD CONSTRAINT portfolio_items_title_not_blank CHECK (btrim(title) <> ''),
  ADD CONSTRAINT portfolio_items_external_link_format CHECK (
    external_link IS NULL OR external_link ~ '^https?://'
  );

-- ─── jobs ───────────────────────────────────────────────────────────────────

ALTER TABLE jobs
  ADD CONSTRAINT jobs_title_not_blank CHECK (btrim(title) <> ''),
  ADD CONSTRAINT jobs_description_not_blank CHECK (btrim(description) <> ''),
  ADD CONSTRAINT jobs_salary_non_negative CHECK (
    (salary_min IS NULL OR salary_min >= 0) AND (salary_max IS NULL OR salary_max >= 0)
  ),
  ADD CONSTRAINT jobs_salary_range CHECK (
    salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max
  ),
  ADD CONSTRAINT jobs_salary_currency_format CHECK (salary_currency ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT jobs_openings_positive CHECK (openings >= 1),
  ADD CONSTRAINT jobs_experience_non_negative CHECK (
    experience_required IS NULL OR experience_required >= 0
  );

CREATE TRIGGER jobs_set_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── applications: state machine ────────────────────────────────────────────
-- APPLIED → REVIEWING → SHORTLISTED → INTERVIEW → OFFER → HIRED
-- Any non-final status → REJECTED. HIRED and REJECTED are final.
-- Must stay identical to APPLICATION_TRANSITIONS in packages/types/src/enums.ts.

CREATE FUNCTION application_transition_allowed(from_status application_status, to_status application_status)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN from_status IN ('hired', 'rejected') THEN false
    WHEN to_status = 'rejected' THEN true
    ELSE from_status::text || '>' || to_status::text IN (
      'applied>reviewing',
      'reviewing>shortlisted',
      'shortlisted>interview',
      'interview>offer',
      'offer>hired'
    )
  END
$$;

ALTER TABLE applications
  ADD CONSTRAINT applications_cv_url_format CHECK (attached_cv_url IS NULL OR attached_cv_url ~ '^https?://');

CREATE FUNCTION applications_validate_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  j RECORD;
  applicant_user uuid;
BEGIN
  IF NEW.status <> 'applied' THEN
    RAISE EXCEPTION 'applications_initial_status: New applications must start as applied (got %)', NEW.status
      USING ERRCODE = 'check_violation', CONSTRAINT = 'applications_initial_status';
  END IF;

  SELECT jobs.is_active, jobs.application_deadline, ep.user_id AS employer_user
    INTO j
    FROM jobs JOIN employer_profiles ep ON ep.id = jobs.employer_id
   WHERE jobs.id = NEW.job_id;
  SELECT user_id INTO applicant_user FROM profiles WHERE id = NEW.applicant_id;

  IF NOT j.is_active THEN
    RAISE EXCEPTION 'applications_job_active: Job % is not accepting applications', NEW.job_id
      USING ERRCODE = 'check_violation', CONSTRAINT = 'applications_job_active';
  END IF;
  IF j.application_deadline IS NOT NULL AND j.application_deadline < current_date THEN
    RAISE EXCEPTION 'applications_job_deadline: Application deadline for job % has passed', NEW.job_id
      USING ERRCODE = 'check_violation', CONSTRAINT = 'applications_job_deadline';
  END IF;
  IF j.employer_user = applicant_user THEN
    RAISE EXCEPTION 'applications_not_own_job: Users cannot apply to their own job'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'applications_not_own_job';
  END IF;
  RETURN NEW;
END $$;

-- Attachments must belong to the applicant.
CREATE FUNCTION applications_validate_attachments() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  applicant_user uuid;
BEGIN
  SELECT user_id INTO applicant_user FROM profiles WHERE id = NEW.applicant_id;
  IF NEW.attached_portfolio_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM portfolio_items WHERE id = NEW.attached_portfolio_id AND profile_id = NEW.applicant_id
  ) THEN
    RAISE EXCEPTION 'applications_portfolio_owner: Attached portfolio item does not belong to the applicant'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'applications_portfolio_owner';
  END IF;
  IF cardinality(NEW.attached_post_ids) > 0 AND (
    SELECT count(*) FROM posts
     WHERE id = ANY (NEW.attached_post_ids) AND user_id = applicant_user
  ) <> cardinality(ARRAY(SELECT DISTINCT unnest(NEW.attached_post_ids))) THEN
    RAISE EXCEPTION 'applications_posts_owner: Attached posts must exist and belong to the applicant'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'applications_posts_owner';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION applications_enforce_status_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.job_id <> OLD.job_id OR NEW.applicant_id <> OLD.applicant_id THEN
    RAISE EXCEPTION 'applications_immutable_parties: Application job and applicant cannot be changed'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'applications_immutable_parties';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT application_transition_allowed(OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'applications_status_transition: Invalid application status transition: % -> %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation', CONSTRAINT = 'applications_status_transition';
  END IF;
  RETURN NEW;
END $$;

-- Audit log: every status (including the initial one) is recorded.
CREATE FUNCTION applications_record_status_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO application_status_history (application_id, old_status, new_status, changed_by)
    VALUES (
      NEW.id, NULL, NEW.status,
      coalesce(current_actor_id(), (SELECT user_id FROM profiles WHERE id = NEW.applicant_id))
    );
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO application_status_history (application_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, current_actor_id());
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER applications_validate_insert
  BEFORE INSERT ON applications
  FOR EACH ROW EXECUTE FUNCTION applications_validate_insert();

CREATE TRIGGER applications_validate_attachments
  BEFORE INSERT OR UPDATE OF attached_portfolio_id, attached_post_ids ON applications
  FOR EACH ROW EXECUTE FUNCTION applications_validate_attachments();

CREATE TRIGGER applications_enforce_status_transition
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION applications_enforce_status_transition();

CREATE TRIGGER applications_record_status_history
  AFTER INSERT OR UPDATE OF status ON applications
  FOR EACH ROW EXECUTE FUNCTION applications_record_status_history();

CREATE TRIGGER applications_set_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── conversations / messages ───────────────────────────────────────────────

ALTER TABLE conversations
  ADD CONSTRAINT conversations_participants_ordered CHECK (participant_one < participant_two);

ALTER TABLE messages
  ADD CONSTRAINT messages_has_payload CHECK (
    (content IS NOT NULL AND btrim(content) <> '')
    OR attachment_url IS NOT NULL
    OR shared_entity_id IS NOT NULL
  ),
  ADD CONSTRAINT messages_attachment_url_format CHECK (
    attachment_url IS NULL OR attachment_url ~ '^https?://'
  ),
  ADD CONSTRAINT messages_read_at_consistent CHECK (NOT is_read OR read_at IS NOT NULL);

CREATE FUNCTION messages_validate_sender() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM conversations
     WHERE id = NEW.conversation_id AND NEW.sender_id IN (participant_one, participant_two)
  ) THEN
    RAISE EXCEPTION 'messages_sender_is_participant: Sender is not a participant of conversation %', NEW.conversation_id
      USING ERRCODE = 'check_violation', CONSTRAINT = 'messages_sender_is_participant';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION messages_touch_conversation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE conversations
     SET last_message_at = greatest(coalesce(last_message_at, NEW.created_at), NEW.created_at)
   WHERE id = NEW.conversation_id;
  RETURN NULL;
END $$;

CREATE TRIGGER messages_validate_sender
  BEFORE INSERT OR UPDATE OF sender_id, conversation_id ON messages
  FOR EACH ROW EXECUTE FUNCTION messages_validate_sender();

CREATE TRIGGER messages_touch_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION messages_touch_conversation();

-- ─── interactions / moderation ──────────────────────────────────────────────

ALTER TABLE follows
  ADD CONSTRAINT follows_not_self CHECK (follower_id <> following_id);

ALTER TABLE reports
  ADD CONSTRAINT reports_reason_not_blank CHECK (btrim(reason) <> '');

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_not_blank CHECK (btrim(type) <> '');
