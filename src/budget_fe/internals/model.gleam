import gleam/int
import gleam/option
import gleam/string
import rada/date as d

pub type User {
  User(id: String, name: String)
}

pub type Category {
  Category(
    id: String,
    name: String,
    target: option.Option(Target),
    inflow: Bool,
  )
}

pub type Target {
  Monthly(target: Money)
  Custom(target: Money, date: MonthInYear)
}

pub type MonthInYear {
  MonthInYear(month: Int, year: Int)
}

pub type Allocation {
  Allocation(id: String, amount: Money, category_id: String, date: Cycle)
}

pub type Cycle {
  Cycle(year: Int, month: d.Month)
}

pub type Transaction {
  Transaction(
    id: String,
    date: d.Date,
    payee: String,
    category_id: String,
    value: Money,
  )
}

pub type Money {
  //s - signature, b - base
  Money(s: Int, b: Int, is_neg: Bool)
}

pub fn money_sum(a: Money, b: Money) -> Money {
  let sign_a = case a.is_neg {
    False -> 1
    True -> -1
  }
  let sign_b = case b.is_neg {
    False -> 1
    True -> -1
  }
  let a_cents = { a.s * 100 + a.b } * sign_a
  let b_cents = { b.s * 100 + b.b } * sign_b
  Money(
    { a_cents + b_cents } / 100 |> int.absolute_value,
    { a_cents + b_cents } % 100 |> int.absolute_value,
    { a_cents + b_cents } < 0,
  )
}

pub fn divide_money(m: Money, d: Int) -> Money {
  Money(m.s / d, m.b / d, m.is_neg)
}

pub fn int_to_money(i: Int) -> Money {
  Money(i |> int.absolute_value, 0, i < 0)
}

pub fn negate(m: Money) -> Money {
  Money(..m, is_neg: True)
}

pub fn float_to_money(i: Int, c: Int) -> Money {
  Money(i |> int.absolute_value, c, i < 0)
}

pub fn string_to_money(raw: String) -> Money {
  let #(is_neg, s) = case string.slice(raw, 0, 1) {
    "-" -> #(True, string.slice(raw, 1, string.length(raw)))
    _ -> #(False, raw)
  }
  case string.replace(s, ",", ".") |> string.split(".") {
    [s, b, ..] ->
      case
        int.parse(s),
        b |> string.pad_end(2, "0") |> string.slice(0, 2) |> int.parse
      {
        Ok(s), Ok(b) -> Money(s, b, is_neg)
        _, _ -> Money(0, 0, is_neg)
      }
    [s, ..] ->
      case int.parse(s) {
        Ok(s) -> Money(s, 0, is_neg)
        _ -> Money(0, 0, is_neg)
      }
    _ -> Money(0, 0, is_neg)
  }
}

pub fn money_to_string(m: Money) -> String {
  let sign = sign_symbols(m)
  sign <> "€" <> money_to_string_no_sign(m)
}

pub fn money_to_string_no_sign(m: Money) -> String {
  m.s |> int.to_string <> "." <> m.b |> int.to_string
}

pub fn money_to_string_no_currency(m: Money) -> String {
  let sign = sign_symbols(m)
  sign <> m.s |> int.to_string <> "." <> m.b |> int.to_string
}

fn sign_symbols(m: Money) -> String {
  case m.is_neg {
    True ->
      case is_zero(m) {
        True -> ""
        False -> "-"
      }
    False -> ""
  }
}

pub fn is_neg(m: Money) -> Bool {
  m.is_neg
}

pub fn is_zero(m: Money) -> Bool {
  case m.s, m.b {
    0, 0 -> True
    _, _ -> False
  }
}

pub fn is_zero_int(m: Money) -> Bool {
  m.s == 0
}
