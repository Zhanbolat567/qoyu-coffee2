# app/config.py
from typing import List, Literal
from pydantic import AnyUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


def _split_csv(value: str | None) -> List[str]:
    if not value:
        return []
    return [x.strip() for x in value.split(",") if x.strip()]


class Settings(BaseSettings):
    # базовые
    app_name: str = "QOYU Coffee API"
    debug: bool = True

    database_url: str
    public_media_url: AnyUrl = "https://qoyucoffee.kz/media"
    media_dir: str = "/media"

    # CORS как СТРОКА (CSV). Потом сами превратим в list.
    cors_origins: str | None = None

    # auth/jwt
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60

    # cookie
    cookie_name: str = "access_token"
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "none", "strict"] = "lax"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="",
        case_sensitive=False,
        extra="ignore",
    )
    @property
    def DATABASE_URL(self) -> str: return self.database_url
    @property
    def PUBLIC_MEDIA_URL(self) -> str: return str(self.public_media_url)
    @property
    def MEDIA_DIR(self) -> str: return self.media_dir
    @property
    def CORS_ORIGINS(self) -> str: return self.cors_origins or ""
    @property
    def SECRET_KEY(self) -> str: return self.secret_key
    @property
    def ACCESS_TOKEN_EXPIRE_MINUTES(self) -> int: return self.access_token_expire_minutes

    # нормализованный список origins
    @property
    def cors_origins_list(self) -> List[str]:
        return _split_csv(self.cors_origins)

settings = Settings()