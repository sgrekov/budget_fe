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

pub fn month_to_name(month: date.Month) -> String {
  case month {
    date.Jan -> "January"
    date.Feb -> "February"
    date.Mar -> "March"
    date.Apr -> "April"
    date.May -> "May"
    date.Jun -> "June"
    date.Jul -> "July"
    date.Aug -> "August"
    date.Sep -> "September"
    date.Oct -> "October"
    date.Nov -> "November"
    date.Dec -> "December"
  }
}
