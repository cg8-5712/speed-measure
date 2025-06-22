from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # 服务器配置
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True
    
    # UDP服务器配置
    udp_host: str = "0.0.0.0"
    udp_port: int = 8888
    
    # 物理常量
    distance_l: float = 3.0  # milimeters
    radius_r1: float = 0.035 # centimeters
    radius_r2: float = 1.5   # meters
    
    class Config:
        env_file = ".env"


settings = Settings()
