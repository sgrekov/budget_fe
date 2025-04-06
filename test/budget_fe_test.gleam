import budget_shared as m
import gleeunit
import gleeunit/should

pub fn main() {
  gleeunit.main()
}

// gleeunit test functions end in `_test`
pub fn money_sum_test() {
  m.money_sum(m.euro_int_to_money(0), m.euro_int_to_money(0))
  |> should.equal(m.euro_int_to_money(0))
  // m.money_sum(m.float_to_money(1, 2), m.float_to_money(1, 3))
  // |> should.equal(m.float_to_money(2, 5))

  // m.money_sum(m.float_to_money(2, 80), m.float_to_money(2, 70))
  // |> should.equal(m.float_to_money(5, 50))

  // m.money_sum(m.float_to_money(3, 2), m.float_to_money(3, 3))
  // |> should.equal(m.float_to_money(6, 5))

  // m.money_sum(m.float_to_money(-4, 90), m.float_to_money(-4, 90))
  // |> should.equal(m.float_to_money(-9, 80))

  // m.money_sum(m.float_to_money(-5, 90), m.float_to_money(4, 80))
  // |> should.equal(m.float_to_money(-1, 10))

  // m.money_sum(m.float_to_money(-5, 70), m.float_to_money(4, 80))
  // |> should.equal(m.float_to_money(0, 90) |> m.negate)

  // m.money_sum(m.float_to_money(-6, 70), m.float_to_money(7, 80))
  // |> should.equal(m.float_to_money(1, 10))

  // m.money_sum(m.float_to_money(-7, 70), m.float_to_money(8, 60))
  // |> should.equal(m.float_to_money(0, 90))
}

pub fn string_to_money_test() {
  m.string_to_money("1.80") |> should.equal(m.Money(180))
  m.string_to_money("2.8") |> should.equal(m.Money(280))
  m.string_to_money("3") |> should.equal(m.Money(300))
  m.string_to_money("4.00") |> should.equal(m.Money(400))
  m.string_to_money("5,00") |> should.equal(m.Money(500))
  m.string_to_money("6,11111111") |> should.equal(m.Money(611))
  m.string_to_money("-7.11") |> should.equal(m.Money(-711))
  m.string_to_money("8.01") |> should.equal(m.Money(801))
}
