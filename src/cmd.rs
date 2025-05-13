use clap::Parser;

#[derive(Parser, Debug)]
#[command(version)]
pub struct Args {
    #[arg(short, long, default_value_t = String::from("./config.yml"), env("APP_CONFIG_PATH"))]
    pub config_path: String,
    #[arg(short, long, default_value_t = String::from("TRACE"), env("APP_LOG_LEVEL"))]
    pub log_level: String,
}

pub fn parse() -> Args {
    Args::parse()
}