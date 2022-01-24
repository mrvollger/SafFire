use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
// rayon breaks things
//use rayon::prelude::*;

#[wasm_bindgen]
extern "C" {
    pub fn alert(s: &str);
}

#[wasm_bindgen]
pub fn my_greet(name: &str) {
    alert(&format!("Hello, {}!", name));
}

#[derive(Serialize, Deserialize)]
pub struct Bed {
    ct: String,
    st: u32,
    en: u32,
    name: String,
    //score: f64,
    strand: String,
    //tst: u32,
    //ten: u32,
    color: String,
    //b_ct: u8,
    b_st: Vec<u32>,
    b_sz: Vec<u32>,
    file: String,
    is_query: bool,
}

#[derive(Serialize, Deserialize)]
pub struct Stats {
    c1_nm: String,
    c1_st: i32,
    c1_en: i32,
    c1_len: i32,
    strand: String,
    c2_nm: String,
    c2_st: i32,
    c2_en: i32,
    c2_len: i32,
    id: f64,
}

#[wasm_bindgen]
pub fn bed(js_bed: &JsValue) {
    let _elements: Vec<Bed> = js_bed.into_serde().unwrap();
}

#[wasm_bindgen]
pub fn mmstats(value: &JsValue) -> i32 {
    let elements: Vec<Stats> = value.into_serde().unwrap();
    //let elements: Vec<Stats> = serde_wasm_bindgen::from_value(value).unwrap();
    elements.iter().map(|r| r.c1_en - r.c1_st).sum()
}

#[derive(Serialize, Deserialize)]
pub struct Point {
    x: i32,
    y: i32,
    z: String,
}
#[wasm_bindgen]
pub fn simple(value: JsValue) -> i32 {
    let xy: Vec<Point> = serde_wasm_bindgen::from_value(value).unwrap();
    xy[0].x + xy[0].y
}
