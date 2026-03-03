use chrono::{DateTime, Datelike, FixedOffset, NaiveDate, TimeZone, Utc};

/// 读取时区偏移（小时），默认 UTC+8（Asia/Shanghai）
pub fn timezone_offset() -> i32 {
    std::env::var("TIMEZONE_OFFSET_HOURS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(8)
}

/// 返回当地今天 00:00:00 和明天 00:00:00 的 UTC 时间
pub fn local_day_bounds_today(offset_hours: i32) -> (DateTime<Utc>, DateTime<Utc>) {
    let tz = FixedOffset::east_opt(offset_hours * 3600).expect("invalid timezone offset");
    let now_local = Utc::now().with_timezone(&tz);
    local_day_bounds_for_date(
        offset_hours,
        now_local.year(),
        now_local.month(),
        now_local.day(),
    )
}

/// 将一个本地 NaiveDate 转换为该日 00:00:00 ~ 次日 00:00:00 的 UTC 时间范围
pub fn local_day_bounds_for_date(
    offset_hours: i32,
    year: i32,
    month: u32,
    day: u32,
) -> (DateTime<Utc>, DateTime<Utc>) {
    let tz = FixedOffset::east_opt(offset_hours * 3600).expect("invalid timezone offset");
    let start_local = tz.with_ymd_and_hms(year, month, day, 0, 0, 0).unwrap();
    let start_utc = start_local.with_timezone(&Utc);
    let end_utc = start_utc + chrono::Duration::days(1);
    (start_utc, end_utc)
}

/// 解析本地 YYYY-MM-DD 并返回该日的 UTC 范围
pub fn parse_local_date_bounds(
    date_str: &str,
    offset_hours: i32,
) -> Result<(DateTime<Utc>, DateTime<Utc>), chrono::format::ParseError> {
    let date = NaiveDate::parse_from_str(date_str, "%Y-%m-%d")?;
    Ok(local_day_bounds_for_date(
        offset_hours,
        date.year(),
        date.month(),
        date.day(),
    ))
}
