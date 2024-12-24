import rada/date

pub fn to_date_string(value: date.Date) -> String {
  date.format(value, "dd.MM.yyyy")
}

pub fn to_date_string_input(value: date.Date) -> String {
  date.format(value, "yyyy-MM-dd")
}

pub fn from_date_string(date_str: String) -> Result(date.Date, String) {
  date.from_iso_string(date_str)
}
