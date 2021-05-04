const http =require('http');
const routes =require('./module/routes');
const url  =require('url');
const mysql = require('mysql');
const ejs = require('ejs');


var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '020305',
    port: '3306',
    database: 'users'
});


connection.connect(function (err) {
    if (err) {
        return console.error("error message " + err.message);
    }
    console.log('Connected to the MySQL server.');
});


http.createServer(function(req,res){
    console.log(req.url);
     // routes.static(req,res,'public');
     var pathname = url.parse(req.url).pathname;
   
     var msg = '';
     if(pathname=='/login'){
        ejs.renderFile("./views/form.ejs",{msg:msg},(err,data)=>{
            res.writeHead(200,{'Content-Type':'text/html;charset:"utf-8"'});
            res.end(data);
        })

     }
     else if(pathname=='/doLogin'){

        // res.end('post ok');
        let postData = "";
        req.on('data',(chunk)=>{
            postData+=chunk;
        })
        req.on('end',()=>{
            console.log(postData);
            res.end(postData);
        })
     }
    connection.query("select * from user",(err,result)=>{
        if(err){
            console.log('err '+err);
        }
      
       var list = result;
        if(pathname!='/favicon.ico'){
            ejs.renderFile('./views/form.ejs',{
                list:list},(err,data)=>{
               console.log(msg);
               res.writeHead(200,{'Content-Type':'text/html;charset:"utf-8"'});
               res.end(data);
            })  
           }
    })
       
    
    // res.writeHead(404,{'Content-Type':'text/html;charset:"utf-8"'});
    // res.end("404 NOT FOUND");


}).listen(3000);