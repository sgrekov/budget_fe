import birl
import gleam/int
import gleam/string

pub fn to_date_string(value: birl.Day) -> String {
  let birl.Day(year, month, day) = value

  int.to_string(year)
  <> "."
  <> {
    month
    |> int.to_string
    |> string.pad_left(2, "0")
  }
  <> "."
  <> {
    day
    |> int.to_string
    |> string.pad_left(2, "0")
  }
}
