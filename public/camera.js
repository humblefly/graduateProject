var isInVideo = false;

console.log(getQueryVariable("id"));

//封装一部分函数
var constrains={
    video:true,
    audio:true
};
var socket = io();
//STUN,TURN服务器配置参数
const iceServer = {
    iceServers: [ 
        //urls: ["stun:ss-turn1.xirsys.com"] }, 
        //{ username: "CEqIDkX5f51sbm7-pXxJVXePoMk_WB7w2J5eu0Bd00YpiONHlLHrwSb7hRMDDrqGAAAAAF_OT9V0dWR1d2Vi", 
        //credential: "446118be-38a4-11eb-9ece-0242ac140004", 
        //urls: ["turn:ss-turn1.xirsys.com:80?transport=udp", "turn:ss-turn1.xirsys.com:3478?transport=udp"]  }
]
};

//PeerConnection
var pc = [];
var localStream = null;


var  localVideoElm;
var linkedList = [];

function getQueryVariable(variable)
{
       var query = window.location.search.substring(1);
       var vars = query.split("&");
       for (var i=0;i<vars.length;i++) {
               var pair = vars[i].split("=");
               if(pair[0] == variable){return pair[1];}
       }
       return(false);
}

function getUserMedia(constrains, success, error) {
    if (navigator.mediaDevices.getUserMedia) {
        //最新标准API
        promise = navigator.mediaDevices.getUserMedia(constrains).then(success).catch(error);
    } else if (navigator.webkitGetUserMedia) {
        //webkit内核浏览器
        promise = navigator.webkitGetUserMedia(constrains).then(success).catch(error);
    } else if (navigator.mozGetUserMedia) {
        //Firefox浏览器
        promise = navagator.mozGetUserMedia(constrains).then(success).catch(error);
    } else if (navigator.getUserMedia) {
        //旧版API
        promise = navigator.getUserMedia(constrains).then(success).catch(error);
    }
}

function canGetUserMediaUse() {
    return !!(navigator.mediaDevices.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
}



$('document').ready(() => {

    $('#joinVideo').click(()=>{
        listEmpty();      
        if(!isInVideo){
        InitCamera();
        isInVideo = true;
        let li = $('<li></li>').text(socket.id).attr('user-id', socket.id);
        $('#user-list-join').append(li);
        $('#joinVideo').text("退出对讲会话");
        // var Uarry = $('#user-list li');
        // for(i=0;i<Uarry.length;i++){
        //     var v = Uarry.eq(i).text();
        //     console.log("pc "+i+"   "+v);
        //     //StartCall(v,true);
        //     socket.emit('join video',{ receiver: v, sender: socket.id });
        // }
       
        for(i=0;i<linkedList.length;i++){
            console.log("linkedlist "+i+" "+linkedList[i]);
            socket.emit('join video',{ receiver: linkedList[i], sender: socket.id });
        }
        
        }
        else{
            isInVideo = false;
            $('#videos').empty();
            $('#user-list-join li[user-id="' + socket.id + '"]').remove();
            $('#joinVideo').text("加入对讲会话");
            localVideoElm.stop;
            window.mediaStreamTrack && window.mediaStreamTrack.stop();
        for(i=0;i<linkedList.length;i++){
            console.log("linkedlist  duankai"+i+" "+linkedList[i]);
            socket.emit('exit video',{ receiver: linkedList[i], sender: socket.id });
        }
        window.location.href="/camera";
      
        }

    })
});


function InitCamera() {
   
    if (!document.getElementById(`${socket.id}-video`)) {
        var newVideo;
        if(constrains.video)
            newVideo = document.createElement('video');
        else
            newVideo= document.createElement('audio');

        newVideo.id = `${socket.id}-video`;
        newVideo.autoplay = true;
        newVideo.controls = true;
        newVideo.title=socket.id;
        document.getElementById('videos').appendChild(newVideo);
        localVideoElm = newVideo;
    }

    if (canGetUserMediaUse()) {
        getUserMedia(constrains, (stream) => {
          
            localStream = stream;
            localVideoElm.srcObject = stream;
            $(localVideoElm).width(600);
            localVideoElm.stop=function(){
                stream.stop();
               
            }
            callVideos();

        }, (err) => {
            console.log('访问用户媒体失败: ', err.name, err.message);
            alert("访问用户媒体失败!\n"+"错误名称:"+err.name+"\n错误信息："+err.message);
        });
    } else {
        alert('您的浏览器不兼容');
    }
    
}

function callVideos(){
    var Uarry2 = $('#user-list-join li');
    for(i=0;i<Uarry2.length;i++){
        var v = Uarry2.eq(i).text();
        console.log("pc "+i+"   "+v);
        if(socket.id!=v)
            StartCall(v,true);
       // socket.emit('join video',{ receiver: v, sender: socket.id });
    }
}

function listEmpty(){
    var Uarry2 = $('#user-list-join li');
    if(Uarry2.length>0){
        constrains={
            video:true,
            audio:true
        };
    }
}


function StartCall(parterName, createOffer) {

    pc[parterName] = new RTCPeerConnection(iceServer);
    console.log("pc    startcall    "+parterName);
    //如果已经有本地流，那么直接获取Tracks并调用addTrack添加到RTC对象中。

    if (localStream) {
        console.log("get stream    ")
        localStream.getTracks().forEach((track) => {
            pc[parterName].addTrack(track, localStream);//should trigger negotiationneeded event
        });

    }else{
        console.log("不可能执行这里了吧");
        //否则需要重新启动摄像头并获取
        if (canGetUserMediaUse()) {
            getUserMedia(constrains, function (stream) {
                localStream = stream;

                localVideoElm.srcObject = stream;
                $(localVideoElm).width(600);
                StartCall(parterName,createOffer);
                return ;
            }, function (error) {
                console.log("访问用户媒体设备失败：", error.name, error.message);
            })
        } else { alert('您的浏览器不兼容'); }
       
    }

    //如果是呼叫方,那么需要createOffer请求
    if (createOffer) {
        console.log("create offer "+parterName);
        //每当WebRTC基础结构需要你重新启动会话协商过程时，都会调用此函数。它的工作是创建和发送一个请求，给被叫方，要求它与我们联系。
        pc[parterName].onnegotiationneeded = () => {
            //https://developer.mozilla.org/zh-CN/docs/Web/API/RTCPeerConnection/createOffer
            console.log("onnegotiationneeded");
            pc[parterName].createOffer().then((offer) => {
                return pc[parterName].setLocalDescription(offer);
            }).then(() => {
                //把发起者的描述信息通过Signal Server发送到接收者
                socket.emit('sdp', {
                    type: 'video-offer',
                    description: pc[parterName].localDescription,
                    to: parterName,
                    sender: socket.id
                });
            })
        };
    }

    //当需要你通过信令服务器将一个ICE候选发送给另一个对等端时，本地ICE层将会调用你的 icecandidate 事件处理程序。有关更多信息，请参阅Sending ICE candidates 以查看此示例的代码。
    pc[parterName].onicecandidate = ({ candidate }) => {
        console.log("onicecandidate");
        socket.emit('ice candidates', {
            candidate: candidate,
            to: parterName,
            sender: socket.id
        });
    };

    //当向连接中添加磁道时，track 事件的此处理程序由本地WebRTC层调用。例如，可以将传入媒体连接到元素以显示它。详见 Receiving new streams 。
    pc[parterName].ontrack = (ev) => {
        console.log("onTrack");
        let str = ev.streams[0];

        if (document.getElementById(`${parterName}-video`)) {
            document.getElementById(`${parterName}-video`).srcObject = str;
            console.log("不需要添加"+parterName);
        } else {
            let newVideo = document.createElement('video');
            newVideo.id = `${parterName}-video`;
            newVideo.autoplay = true;
            newVideo.controls = true;
            //newVideo.className = 'remote-video';
            newVideo.srcObject = str;
            console.log("需要添加"+parterName);
            document.getElementById('videos').appendChild(newVideo);
        }
    }



}



socket.on('connect', () => {
   // InitCamera();

    //输出内容 其中 socket.id 是当前socket连接的唯一ID
    console.log('connect ' + socket.id);

    $('#user-id').text(socket.id);
    
    pc.push(socket.id);
    socket.emit('new user greet', {
        sender: socket.id,
        msg: 'hello world'
    });

    socket.on('need connect', (data) => {

        console.log("need connect  "+data.sender);
        linkedList.push(data.sender);
        //创建新的li并添加到用户列表中
        let li = $('<li></li>').text(data.sender).attr('user-id', data.sender);
        $('#user-list').append(li);
        // console.log(data.sender);
       
        //同时创建一个按钮
        // let button = $('<button class="call">通话</button>');
        // button.appendTo(li);
        // //监听按钮的点击事件, 这是个demo 需要添加很多东西，比如不能重复拨打已经连接的用户
        // $(button).click(function () {
        //     //$(this).parent().attr('user-id')
        //     console.log($(this).parent().attr('user-id'));
        //     //点击时，开启对该用户的通话
        //     StartCall($(this).parent().attr('user-id'), true);
        // });
        
        socket.emit('ok we connect', { receiver: data.sender, sender: socket.id,isOpen:isInVideo});
       // StartCall(data.sender, true);
    });
    //某个用户失去连接时，我们需要获取到这个信息
    socket.on('user disconnected', (socket_id) => {
        console.log('disconnect : ' + socket_id);
        $('#user-list li[user-id="' + socket_id + '"]').remove();
        $('#user-list-join li[user-id="' + socket_id + '"]').remove();
        var bd = "#"+socket_id+"-video";
        console.log("delete  id "+bd);
        $(bd).remove();
       for(i=0;i<linkedList.length;i++){
           if(linkedList[i]==socket_id){
               console.log("remove socket"+linkedList[i]);
               linkedList.splice(i,1);
               break;
           }
       }
       
       
       
       
    })
    //链接吧..
    socket.on('ok we connect', (data) => {
        linkedList.push(data.sender);
        console.log("ok  connect   "+data.sender+" "+data.isOpen);
        let li = $('<li></li>').text(data.sender).attr('user-id', data.sender);
        if(data.isOpen){
            $('#user-list-join').append(li);
        }
        else{
            $('#user-list').append(li);
        }
        //这里少了程序，比如之前的按钮啊，按钮的点击监听都没有。
    });

    //监听发送的sdp事件
    socket.on('sdp', (data) => {
        //如果时offer类型的sdp
        if (data.description.type === 'offer') {
            //那么被呼叫者需要开启RTC的一套流程，同时不需要createOffer，所以第二个参数为false
            console.log("is a offer");
            StartCall(data.sender, false);
            //把发送者(offer)的描述，存储在接收者的remoteDesc中。
            let desc = new RTCSessionDescription(data.description);
            //按1-13流程走的
            pc[data.sender].setRemoteDescription(desc).then(() => {

                pc[data.sender].createAnswer().then((answer) => {
                    return pc[data.sender].setLocalDescription(answer);
                }).then(() => {
                    socket.emit('sdp', {
                        type: 'video-answer',
                        description: pc[data.sender].localDescription,
                        to: data.sender,
                        sender: socket.id
                    });

                }).catch();//catch error function empty

            })
        } else if (data.description.type === 'answer') {
            //如果使应答类消息（那么接收到这个事件的是呼叫者）
            console.log("is  an  answer");
            //StartCall(socket.id,false);
            let desc = new RTCSessionDescription(data.description);
            pc[data.sender].setRemoteDescription(desc);
        }
    })

    //如果是ice candidates的协商信息
    socket.on('ice candidates', (data) => {
        console.log('ice candidate: ' + data.candidate);
        //{ candidate: candidate, to: partnerName, sender: socketID }
        //如果ice candidate非空（当candidate为空时，那么本次协商流程到此结束了）
        if (data.candidate) {
            var candidate = new RTCIceCandidate(data.candidate);
            //讲对方发来的协商信息保存
            pc[data.sender].addIceCandidate(candidate).catch();//catch err function empty
        }
    })

    //监听谁加入了
    socket.on('join video',(data)=>{
        console.log("join video 2"+data.sender);
        $('#user-list li[user-id="' + data.sender + '"]').remove();
        let li = $('<li></li>').text(data.sender).attr('user-id', data.sender);
        $('#user-list-join').append(li);
    })

    //退出会话
    socket.on('exit video',(data)=>{
        $('#user-list-join li[user-id="' + data.sender + '"]').remove();
        let li = $('<li></li>').text(data.sender).attr('user-id', data.sender);
        $('#user-list').append(li);
        var bd = "#"+data.sender+"-video";
        $(bd).remove();
    })
});
