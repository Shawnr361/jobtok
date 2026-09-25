import type { VideoPlayer } from 'expo-video';

/**
 * expo-video players are controlled by setting properties. Doing it through a helper keeps
 * React's "don't mutate hook values" lint rule happy without changing behaviour.
 */
export function setPlayerMuted(player: VideoPlayer, muted: boolean) {
  player.muted = muted;
}
