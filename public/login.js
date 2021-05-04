
 function Login(){
      var phoneNumber = document.getElementById('phone');
      var password = document.getElementById('password');
      var selectSql="select name from users.user where phoneNumber='"+phoneNumber.nodeValue+"' and password='"+password.nodeValue+"'";
      console.log('phon '+phoneNumber.nodeValue+"  pass "+password.nodeValue);
      connection.query(selectSql,function(err,result){
        if(err){
            console.log('[login ERROR] - ',err.message);
            return;
           }
           //console.log(result);
           if(result=='')
           {
               console.log("帐号密码错误");
           }
           else
           {
               alert("登录成功"+result.message);
               console.log("OK");
              
           }
      });
  }