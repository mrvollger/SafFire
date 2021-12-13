
function get_url_elm(tag) {
    const parsedHash = new URLSearchParams(
        window.location.hash.substr(1) // skip the first char (#)
    );
    var val = parsedHash.get(tag);
    console.log(`url ${tag}: ${val}`);
    return val;
}

function set_default_hash() {
    window.location.hash = "#ref=CHM13_v1.1&query=CHM1";
    window.location.hash = "#ref=CHM13_v1.1&query=GRCh38";
}