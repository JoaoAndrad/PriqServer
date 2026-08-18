export interface GameDTO {
  id: string;
  tgdbId: number | null;
  steamAppId: number | null;
  name: string;
  slug: string;
  coverUrl: string | null;
  genres: string | null;
  description: string | null;
  platforms: string | null;
  modes: string | null;
  released: string | null;
  onGamePass: boolean;
}

export interface UserGameDTO {
  id: string;
  userId: string;
  gameId: string;
  interested: boolean;
  favorite: boolean;
  owned: boolean;
  blacklisted: boolean;
  source: string;
  game: GameDTO;
}

export interface UserSummaryDTO {
  id: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
}
