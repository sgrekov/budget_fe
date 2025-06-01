import { Ok, Error } from "./gleam.mjs";

export function read_localstorage(key) {
  const value = window.localStorage.getItem(key);

  return value ? new Ok(value) : new Error(undefined);
  // return value ? value : undefined;
}

export function write_localstorage(key, value) {
  window.localStorage.setItem(key, value);
}

export function get_file_name() {
    return document.getElementById('file-input').files[0].name;
}

export function get_file_content(callback) {
    const file = document.getElementById('file-input').files[0];
    const reader = new FileReader()

    reader.onload = function (e) {
        const fileContent = e.target.result
        callback(fileContent);
    }
    reader.readAsText(file)    
}