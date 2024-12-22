// import birl
import gleam/int
import gleam/list
import gleam/result
import gleam/string
import rada/date

pub fn to_date_string(value: date.Date) -> String {
  date.format(value, "dd.MMMM.yyyy")
  // int.to_string(year)
  // <> "."
  // <> {
  //   month
  //   |> int.to_string
  //   |> string.pad_start(2, "0")
  // }
  // <> "."
  // <> {
  //   day
  //   |> int.to_string
  //   |> string.pad_start(2, "0")
  // }
}

pub fn from_date_string(date_str: String) -> Result(date.Date, String) {
  date.from_iso_string(date_str)
  // case
  //   string.split(date_str, ".")
  //   |> list.map(fn(s) { int.parse(s) |> result.unwrap(1) })
  // {
  //   [year, month, day, ..rest] -> Ok(birl.Day(year, month, day))
  //   _ -> Error("error parsing")
  // }
}
// pub fn time_to_day(time: birl.Time) -> birl.Day {
//   case
//     birl.to_date_string(time)
//     |> string.split("-")
//     |> list.map(fn(s) { int.parse(s) |> result.unwrap(1) })
//   {
//     [year, month, day, ..rest] -> birl.Day(year, month, day)
//     rest -> birl.Day(2024, 12, 12)
//   }
// }
