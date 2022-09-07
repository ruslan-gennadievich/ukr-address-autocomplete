import * as http from "http";
//import * as unzip from "unzip";
import * as readline from "readline";
import * as fs from 'fs';
import iconv from "iconv-lite";
import { default as restApi } from './rest_utls.mjs';

let words = Array();
const api_port = process.env.PORT || 8081;
const postIndexHousesUrl = process.env.UKRPOSHTA_DB_URL
    || 'http://services.ukrposhta.com/postindex_new/upload/houses.zip';
   
// if (!fs.existsSync('houses.csv')) {
//     http.get(postIndexHousesUrl, (response) => {
//         response
//         .pipe(unzip.Parse())
//         .on("entry", async (entry) => {
//             if (entry.path === "houses.csv") {
//                 console.log(`Found houses.csv`);
//                 entry.pipe(fs.createWriteStream('houses.csv'));
//             } else {
//                 entry.autodrain();
//             }
//         });
//     });
// }

const rl = readline.createInterface({
    input: fs.createReadStream('houses.csv', { encoding: 'binary' }),
    output: process.stdout,
    terminal: false
});
rl.on('line', line => {
    const encodedData = iconv.decode(line, 'win1251');
    const list = encodedData.split(';');
    const oblast = list[0];
    if (oblast === 'Область') return;    
    let naspunkt = list[4].toLowerCase();
    if (naspunkt.startsWith('м.')) naspunkt = naspunkt.slice(3)
    if (naspunkt.startsWith('с.')) naspunkt = naspunkt.slice(3)
    if (naspunkt.startsWith('смт.')) naspunkt = naspunkt.slice(5)
    let ulica = list[6].toLowerCase();
    //if (ulica.startsWith('вул.')) ulica = ulica.slice(5)
    const dom = list[7];
    if (!words[oblast]) words[oblast] = new Array();
    if (!words[oblast][naspunkt]) words[oblast][naspunkt] = new Array();
    if (!words[oblast][naspunkt][ulica]) words[oblast][naspunkt][ulica] = new Array();
    words[oblast][naspunkt][ulica].push(dom);    
});
rl.on('close', line => {
    console.log('houses.csv is loaded')
})
new restApi({  
    GET_address(req, res, params) {    
      res.setHeader('Content-Type', 'application/json');
      let oblast = params?.params?.oblast;
      if (!oblast) { res.end(JSON.stringify({error: 1})); return }
      oblast = decodeURIComponent(oblast);
      
      let naspunkt = params?.params?.naspunkt;
      if (!naspunkt) { res.end(JSON.stringify({error: 2})); return }      
      if (naspunkt) naspunkt = decodeURIComponent(naspunkt).toLowerCase();
 
      let street = params?.params?.street;
      if (street) street = decodeURIComponent(street).toLowerCase(); 
      
      let resultNaspunkt = new Set()
      let resultStreet = new Set()
      let resultHouse = new Set()

      if (!street) {
        if (words[oblast] === undefined) {
            res.end(JSON.stringify({error: 3}))
            return
        }        
        for (let npunkt in words[oblast]) {            
            if (npunkt.indexOf(naspunkt) > -1) resultNaspunkt.add(npunkt);
        }        
      } else {  
        if (words[oblast] === undefined) {
            res.end(JSON.stringify({error: 4}))
            return
        }              
        if (words[oblast][naspunkt] === undefined) {
            res.end(JSON.stringify({error: 5}))
            return
        }
        resultNaspunkt.add(naspunkt);
        for (let oneStreet in words[oblast][naspunkt]) {
            if (oneStreet.indexOf(street) > -1) {
                resultStreet.add(oneStreet);
            } else {
                // try swap words
                let arrStreetWord = street.split(' ')
                if (oneStreet.indexOf(arrStreetWord[1] + ' ' + arrStreetWord[0]) > -1)
                    resultStreet.add(oneStreet);    
            }
        }
        if (resultStreet.size === 1) {            
            let houseArr = words[oblast][naspunkt][resultStreet.values().next().value]            
            for (let str_house of houseArr) {
                let houses = str_house.split(',')                
                if (houses.length > 0)
                    for (let house of houses)
                        if (house) resultHouse.add(house.trim());
            }            
        }
      }
      let resultObj = {'result': {
        'naspunkt': Array.from(resultNaspunkt),
        'street': Array.from(resultStreet),
        'house': Array.from(resultHouse)
      }}      
      res.end(JSON.stringify(resultObj));
    }, api_port 
})
console.log('Please wait...')