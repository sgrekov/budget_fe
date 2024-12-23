import rada/date

pub fn to_date_string(value: date.Date) -> String {
  date.format(value, "dd.MMMM.yyyy")
}

pub fn from_date_string(date_str: String) -> Result(date.Date, String) {
  date.from_iso_string(date_str)
}
