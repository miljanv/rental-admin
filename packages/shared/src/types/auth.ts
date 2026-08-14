export interface AuthUserDto {
  id: string;
  username: string;
}

export interface LoginResult {
  token: string;
  user: AuthUserDto;
}
