var http = require('http').createServer(app);
const path = require('path');
const cookieParser = require('cookie-parser');
var bodyParser = require('body-parser')

const fs = require('fs');
let sslOptions = {
    key: fs.readFileSync("C:/Users/humbl/privkey.key"),
    cert: fs.readFileSync("C:/Users/humbl/cacert.pem")

};
const express = require('express');
const session = require('express-session')
var app = express();

app.use(cookieParser("dafasfsasg"));
const https = require('https').createServer(sslOptions, app);

app.use(express.static(path.join(__dirname, 'public')))

app.set("view engine", "ejs");


//配置session
app.use(session({
    secret: 'this is a session',  //随意字符串 session的签名
    name: "userId",
    resave: false,   //强制存储session 即使没有变化 
    saveUninitialized: true,   //强制将未初始化的session存储
    cookie: {
        maxAge: 1000 * 60 * 60,
        secure: false
    }, rolling: true
}))

var io = require('socket.io')(https);

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

//记录已经登录的用户
var loginUsers = [];


var mysql = require('mysql');  //导入mysql包


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


app.get('/', (req, res) => {
    //  res.sendFile(__dirname + '/login.html');
    //设置cookie
    if (req.session.userId) {
        console.log(req.session.store);

        res.render('index', { username: req.session.store.name, id: req.session.userId });

    }
    else
        res.redirect('/login');

});

app.get('/login', (req, res) => {


    res.sendFile(path.resolve('./public/login.html'));


});
// app.use((req, res, next) => {
//     if (req.session.name) {
//         next();
//     }
//     else
//         res.redirect('/login');
// })

app.get('/name', (req, res) => {
    if (req.session.username) {
        console.log(req.session);
        res.send(req.session.username + "--已登录");
    }
    else {
        let username = req.signedCookies.username;
        res.send("用户名" + username);
    }
})

app.get('/createRoom', (req, res) => {
    if (!req.session.userId)
        res.redirect('/');
    else {
        var sql = 'SELECT u_id FROM users.apartment where a_id=' + req.query.roomId;
        connection.query(sql, (err, result) => {
            if (err) {
                console.log("error " + err);
                res.send({ result: false, msg: "访问数据库出错" });
            }
            else {
                // console.log(result);
                if (result == "" || result[0].u_id == null) {
                    res.send({ result: false, msg: "该房间暂无用户！" });
                }
                else {
                    if (req.query.sponsor == result[0].u_id)
                        res.send({ result: false, msg: "不能向自己发起对讲!" });
                    else {
                        // var selectSQL = 'SELECT * FROM users.vcs where roomid=' + room + ' and valid=1';
                        var sql = "INSERT INTO `users`.`vcs` (`sponsor`, `receiver`, `roomid`, `roomname`) VALUES (" + req.query.sponsor + "," + result[0].u_id + "," + req.query.roomId + ",'" + req.query.roomName + "')";
                        var rec = result[0].u_id;
                        connection.query(sql, (err, result) => {
                            if (err) {
                                console.log(err);
                                res.send({ result: false, msg: "创建对讲房间失败，请重试!" });

                            }
                            else {
                                // console.log(result);
                                res.send({ result: true, csvid: result.insertId,receiver:rec })
                            }
                        })

                    }
                }
            }
        })
    }
})

app.post('/doRegist', (req, res) => {
    console.log(req.body);
    var sqlInsert = 'INSERT INTO user (phoneNumber, password, name) VALUES (' + req.body.phone + ',' + req.body.password + ',' + req.body.name + ')';
    connection.query(sqlInsert, (err, result) => {
        if (err) {
            console.log("error " + err);
            res.send(false);
        }
        else {
            // console.log(result);
            res.send(true);
        }
    })
});



app.post('/doLogin', (req, res) => {

    var selectSQL = "select u_id,name from user where phoneNumber = '" + req.body.phoneNumber + "' and password = '" + req.body.password + "'";
    console.log(selectSQL);
    connection.query(selectSQL, (err, result) => {

        if (err) {
            console.log("error " + err);
            res.send("连接数据库出错");

        }
        if (result == "") {
            req.session.error = '用户名或密码不正确';
            console.log("用户名或密码不正确");
            res.send(false);

        }
        else {
            // console.log(result);
            var userId = result[0].u_id;
            //res.cookie("username", username, { maxAge: 1000 * 60 * 60, signed: true });
            req.session.userId = userId;
            req.session.store = result[0];

            res.send(true);

        }
    })


})


app.post('/logout', (req, res) => {
    loginUsers[req.session.store.name] = null;
    req.session.destroy();
    res.send(true);
    // res.redirect('/');
})

app.get('/camera/', (req, res) => {

    console.log("id" + req.query.id);
    if (!req.session.userId)
        res.redirect('/');
    else
        res.sendFile(__dirname + '/camera.html');
})

app.get('/room/', (req, res) => {
    if (!req.session.userId)
        res.redirect('/');
    else {
        var sql ="SELECT *,date_format(create_time,'%Y-%m-%d %T') as newtime FROM users.vcs where csv_id="+req.query.csvid+" and valid=1";
        connection.query(sql,(err,result)=>{
            if(err||result==""){
                res.send("发起对讲失败，请重新尝试！");
            }
            else{
                // console.log(result);
                if(result[0].sponsor==req.session.userId||result[0].receiver==req.session.userId){
                   
                    res.render('room', { username: req.session.store.name, id: req.session.userId,roomdata:result[0] });
                }
                else{
                    res.send("发起对讲失败，请重新尝试！");
                }

            }
        })
    }


})

app.get('/getVCS', (req, res) => {
    if (!req.session.userId)
        res.redirect('/');
    else {
        var sql = "SELECT *,date_format(create_time,'%Y-%m-%d %T') as newtime FROM users.vcs where (sponsor="
            + req.query.userId + ' or receiver=' + req.query.userId + ') and valid=1';

        connection.query(sql, (err, result) => {
            if (err) {
                console.log(err);
                res.send({ result: false });
            }
            else {
                // console.log(result);
                res.send({ result: true, data: result });
            }
        })

    }
})

app.get('/getUserName',(req,res)=>{
    console.log(req.query);
    if (!req.session.userId)
         res.redirect('/');
    else{
        if(req.query.list.length<1)
            return ;
        var sql = "SELECT u_id,name FROM users.user where u_id="+req.query.list[0];
        for(i=1;i<req.query.list.length;i++){
            sql += " or u_id="+req.query.list[i]; 
        }
        console.log('sql ' + sql);
        connection.query(sql,(err,result)=>{
            if(err){
                console.log(err);
                res.send({result:false,msg:err})
            }
            else if(result==""){
                console.log("找不到账户信息");
                res.send({result:false,msg:"找不到账户信息"})
            }
            else{
                // console.log(result);
                res.send({result:true,data:result})
            }
        })
    }
})

app.get('/getRoomData', (req, res) => {
    console.log(req.query);
    if (!req.session.userId)
        res.redirect('/');
    else {
        var sql;
        if (req.query.name == 'community')
            sql = 'SELECT * FROM community';
        else if (req.query.name == 'term')
            sql = 'SELECT distinct term FROM users.apartment where c_id=' + req.query.c_id;
        else if (req.query.name == 'floor')
            sql = 'SELECT distinct floor FROM users.apartment where c_id=' + req.query.c_id + ' and term="' + req.query.term + '" order by floor';
        else if (req.query.name == 'room')
            sql = 'SELECT distinct room,a_id FROM users.apartment where c_id=' + req.query.c_id + ' and term="' + req.query.term + '" and floor=' + req.query.floor + ' order by room';
        else
            res.send("");
        connection.query(sql, (err, result) => {
            if (err) {
                console.log(err);
                res.send(err);
            }
            else {
                // console.log(result);
                res.send(result);
            }
        })

    }
})

// app.get('/getMap',(req,res)=>{
//     $.ajax({
//         url:'http://api.map.baidu.com/reverse_geocoding/v3/?ak=ZvE4XdhgrYAaEW6PryVokIGEVf6nxYKM&output=json&coordtype=wgs84ll&location='+req.query.latitude+','+req.query.longitude,
//         method:'get',
//         dataType:'JSON',
//         success:(result)=>{
//             console.log('map result');
//             console.log(result);
//             res.send(result);
//         }
//     })
// })

app.get('/closeRoom', (req, res) => {
    if (!req.session.userId)
        res.redirect('/');
    else {
        var sql = "UPDATE users.vcs SET valid = '0' WHERE csv_id = " + req.query.csvid +" and (sponsor="+req.session.userId+" or receiver="+req.session.userId+")";
        connection.query(sql, (err, result) => {
            if (err) {
                console.log(err);
                res.send(false);
            }
            else {
                // console.log(result);
                res.send(true);
            }

        })
    }
})


app.use((req, res, next) => {
    res.status(404).send("404 NOT FOUND");
})



io.on('connection', (socket) => {
    socket.join(socket.id);

    console.log('a user connected :' + socket.id);


    socket.on('disconnect', () => {
        console.log('a user disconnected :' + socket.id);
        for (var i = 0; i < loginUsers.length; i++) {
            if (loginUsers[i] == socket.id) {
                loginUsers[i] = null;
                break;
            }
        }
        socket.broadcast.emit('user disconnected', socket.id);
    });

    // socket.on('chat message', (msg) => {
    //     console.log(socket.id + 'say:' + msg);
    //     var msg2 = socket.id + ' say : ' + msg;
    //     io.emit('chat message', msg2);
    // });

    // socket.on('new user greet', (data) => {
    //     console.log(data);
    //     console.log(socket.id + ' greet ' + data.msg);
    //     socket.broadcast.emit('need connect', { sender: socket.id, msg: data.msg });

    // });

    // socket.on('ok we connect', (data) => {

    //     io.to(data.receiver).emit('ok we connect', { sender: data.sender, isOpen: data.isOpen });
    // });


    //sdp candicate
    socket.on('sdp', (data) => {
        console.log('sdp');
        console.log(data.description);
        socket.to(data.to).emit('sdp', { description: data.description, sender: data.sender });
    });

    socket.on('ice candicates', (data) => {
        console.log('ice candicates : ');
        console.log(data);
        socket.to(data.to).emit('ice candicates', {
            candicate: data.candicate,
            sender: data.sender
        });
    });

    // socket.on('join video', (data) => {
    //     console.log("join video 1");
    //     socket.to(data.receiver).emit('join video', {
    //         sender: data.sender
    //     });
    // });

    // socket.on('exit video', (data) => {
    //     socket.to(data.receiver).emit('exit video', {
    //         sender: data.sender
    //     });
    // });


    socket.on("get users list", (data) => {
        var selectSQL = "select name from user";
        connection.query(selectSQL, function (err, result) {
            if (err) {
                console.log('[get uerslist ERROR] - ', err.message);
                return;
            }
            // console.log(result);
            if (result != "") {
                console.log(data.sender);
                io.to(data.sender).emit('userlist result', {
                    result: result
                });
            }
        });
    });

    socket.on('user login', (data) => {
        console.log(data);
        loginUsers[data.username] = data.sender;
        console.log(loginUsers);
        socket.broadcast.emit('new user login', {
            sender: data.sender,
            username: data.username
        })
    })

    // socket.on('online user', (data) => {
    //     socket.to(data.receiver).emit('online user', {
    //         sender: data.sender,
    //         username: data.username
    //     })
    // });


    //回应获取用户信息
    socket.on('get user info', (data) => {
        //获取当前账户绑定的房间信息 传数据给前端页面
        var sql = "SELECT a.a_id,c.c_name,a.term,a.floor,a.room FROM apartment a  join community c on a.u_id=" + data.userId + " and a.c_id=c.c_id;"
        connection.query(sql, (err, result) => {
            if (err) {
                console.log('err ' + err);

            }
            else {
                console.log(data.sender + " " + result);
                io.to(data.sender).emit('userinfo result', {
                    result: result
                })
            }
        })

    });

    //转发邀请信息
    socket.on('invitation video', (data) => {
        console.log("invitation"+data.receiver)
        var sql = "SELECT name FROM users.user where u_id="+data.receiver;
        connection.query(sql,(err,result)=>{
            if(err){
                console.log(err);
            }
            else if(result==""){
                console.log("查不到数据");
            }
            else{
                var name =result[0].name; 
                console.log(name);
                console.log(loginUsers);
                if (loginUsers[name] != null) {
                    io.to(loginUsers[name]).emit('invitation video', {
                        csvid:data.csvid,
                        sender:data.sender                                            
                    })
                }
            }
        })

    });


    

    socket.on('join room',(data)=>{
        socket.join('room '+data.room);
        console.log(data);
        socket.to('room '+data.room).emit('join room',{
            sender:data.sender,
            username:data.username
        })
    })


    socket.on('add user',(data)=>{
        io.to(data.receiver).emit('add user',{
            sender:socket.id,
            username:data.username,
        })
    })
});





https.listen(433, () => {
    console.log("https listen on * :433");
})

// http.listen(3000,() =>{

//     console.log('listen on * :3000');

// });