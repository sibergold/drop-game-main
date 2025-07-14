const fs = require( "fs" );
const ComfySheets = require( "comfysheets" );

const SHEET_ID = "1OgJA5tPAzTkGg3pjpctYMZNET6cwEBs8HuL41Lq-UyA";

( async () => {
    const catalogs = {
        "catalog": "451420023",
        "catalog_outfits": "0",
        "catalog_characters": "45642748",
        "catalog_pets": "2053660435",
        "catalog_addons": "1761485007",
    }

    for( const catalog in catalogs ) {
        let items = await ComfySheets.Read( SHEET_ID, "Items", {}, catalogs[ catalog ] );
        // console.log( catalogItems );
        fs.writeFileSync( `${catalog}.json`, JSON.stringify( items, null, "\t" ) );
        console.log( `Saved ${catalog}.json` );
    }
})();
