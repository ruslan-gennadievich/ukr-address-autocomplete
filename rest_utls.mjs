import { createServer } from 'http';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Credentials': 'true'
};

export default class restApi {
  #server = null;
  #restObj = {}
  constructor(restObj, port=5000, bindip='0.0.0.0') {
    this.#restObj = restObj;
    this.#server = createServer((req, res) => {
      let inputData = [];
      req.on("error", (err) => console.error('server error', err));
      req.on("data", (data) => inputData.push(data));
      req.on("end", () => {
        console.log(req.method, req.url);
        if (req.method === 'OPTIONS') {
          res.writeHead(204, cors);
          res.end();
          return;
        }
        //res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        callRest(req, res, inputData, restObj, '/');
      });
    }).listen(port, bindip);  
    console.log("Listen port", port);

    process.on("SIGINT", (code) => {
      console.log("Process SIGNAL: ", code);  
      this.#server.close();
      process.exit();
    });
  
  }
}

const getMethods = (obj) => Object.getOwnPropertyNames(obj).filter(item => typeof obj[item] === 'function')
class UrlParams {
    /* Можно юзать вместо URLSearchParams который заменяет плюсики на пробелы итп) */
    constructor(search) {
      this.qs = search || location.search;
      if (this.qs[0] === '?') this.qs = this.qs.substr(1);
      this.params = {};
      this.parseQuerstring();
    }
    parseQuerstring() {
      this.qs.split("&").reduce((a, b) => {
        let [key, val] = b.split("=");
        a[key] = val;
        return a;
      }, this.params);
    }
    get(key) {
      return this.params[key];
    }
}

function callRest (req, res, inputDataForPost, rest, baseURL='/') {
  const paramPos = req.url.indexOf("?");
  const restFunc = paramPos === -1 ? req.url : req.url.substr(0, paramPos);        
  if (typeof(rest[req.method + '_' + restFunc.substr(1)]) === 'function'){
      const params = paramPos > -1 ? new UrlParams(req.url.substr(paramPos)) : null;      
      return rest[req.method + '_' + restFunc.substr(1)](req, res, params);
  } else {
      const methods = getMethods(rest);
      res.write("<html>");
      res.write("Avaible methods:<br>");
      methods.forEach(method => {
        if (method.substring(0,3) === 'GET') {
          let link = '/' + method.substring(4);
          res.write(`(GET) <a href="${link}">${link}</a><br>`);
        } else {
          let pos = method.indexOf("_");
          res.write(`(${method.substring(0,pos)}) /` + method.substring(pos+1) + '<br>');
        }        
      });
      res.write('</html>');
      res.end();
  }        
}