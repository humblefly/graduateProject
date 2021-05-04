const url = require('url');
const mime = require('mime');
const fs = require('fs')
const path = require('path')

exports.static = function (req, res, staticPath) {
    let pathname = url.parse(req.url).pathname;
    console.log('static '+pathname);
    pathname = pathname == '/' ? '/test.html' : pathname;
    let extname = path.extname(pathname);
    console.log(extname);
    if (pathname != '/favicon.ico') {

        try {
            let data = fs.readFileSync("./"+staticPath+pathname);
            
            if (data) {
              
                let a = mime.getType(extname);
                console.log(type);
                res.writeHead(200, { 'Content-Type':+''+a+ ';charset="utf-8"' });
                res.end(data);
            }
        } catch (error) {
            console.log(error);
        }


    }

}