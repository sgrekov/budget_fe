import gleam/int
import gleam/string

fn format_uuid(src: String) -> String {
  string.slice(src, 0, 8)
  <> "-"
  <> string.slice(src, 8, 4)
  <> "-"
  <> string.slice(src, 12, 4)
  <> "-"
  <> string.slice(src, 16, 4)
  <> "-"
  <> string.slice(src, 20, 12)
}

pub fn guidv4() -> String {
  // Original doc: https://www.cryptosys.net/pki/uuid-rfc4122.html

  // 16 random bytes -> let's chunk it into 4 * 4 bytes
  // named: A, B, C, D

  //                  A                 |                 B                  |
  //                  C                 |                 D                  |
  // 00000000 00000000 00000000 00000000 00000000 00000000 00000000 00000000
  // 00000000 00000000 00000000 00000000 00000000 00000000 00000000 00000000

  // Adjust certain bits according to RFC 4122 section 4.4 as follows:
  // set the four most significant bits of the 7th byte to 0100'B, so the high nibble is "4"
  // set the two most significant bits of the 9th byte to 10'B, so the high nibble will be one of "8", "9", "A", or "B" (see Note 1).

  // From the RFC:
  // - the 7th byte is the 3rd byte of B
  // - the 9th byte is the 1st byte of C

  let a =
    int.random(0xFFFFFFFF)
    |> int.to_base16
    |> string.pad_start(8, "0")

  let b =
    int.random(0xFFFFFFFF)
    |> int.bitwise_and(0x3FFFFFFF)
    |> int.bitwise_or(0x00000000)
    |> int.to_base16
    |> string.pad_start(8, "0")

  let c =
    int.random(0xFFFFFFFF)
    |> int.bitwise_and(0x3FFFFFFF)
    |> int.bitwise_or(0x80000000)
    |> int.to_base16
    |> string.pad_start(8, "0")

  let d =
    int.random(0xFFFFFFFF)
    |> int.to_base16
    |> string.pad_start(8, "0")

  let concatened = a <> b <> c <> d

  format_uuid(concatened)
}