// admin.js - Forces server reads
(function(){
"use strict";
var AU=null,cats=[],prods=[];
var $=function(id){return document.getElementById(id)};
function esc(t){if(!t)return"";var d=document.createElement("div");d.textContent=t;return d.innerHTML}
function toast(m,ty){var c=$("TC"),e=document.createElement("div");e.className="toast "+(ty||"info");e.innerHTML='<span class="t-ico">'+({success:"✅",error:"❌",warning:"⚠️",info:"ℹ️"}[ty]||"ℹ️")+'</span><span class="t-msg">'+m+'</span>';c.appendChild(e);setTimeout(function(){e.remove()},3e3)}
function now(){return new Date().toISOString()}

// Force server reads
function serverGet(ref){
  return ref.get({source:"server"}).catch(function(){
    return ref.get();
  });
}

// AUTH
auth.onAuthStateChanged(function(u){
  $("L").classList.add("hidden");
  if(u){
    if(!isAdmin(u.email)){
      $("LE").textContent='Not admin: "'+u.email+'". Add to ADMIN_EMAILS in firebase-config.js';
      $("LE").style.display="block";
      auth.signOut();
      $("LS").style.display="flex";
      $("ADMIN").style.display="none";
      return;
    }
    AU=u;
    ensureUserDocument(u).then(function(){bootA()}).catch(function(){bootA()});
  } else {
    AU=null;
    $("LS").style.display="flex";
    $("ADMIN").style.display="none";
  }
});

$("gLogin").addEventListener("click",function(){
  var b=this;b.disabled=true;b.textContent="Signing in...";$("LE").style.display="none";
  auth.signInWithPopup(googleProvider).then(function(){
    b.disabled=false;
    b.innerHTML='<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"> Continue with Google';
  }).catch(function(e){
    b.disabled=false;
    b.innerHTML='<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"> Continue with Google';
    $("LE").textContent=e.message;$("LE").style.display="block";
  });
});

$("xLogout").addEventListener("click",function(e){e.preventDefault();auth.signOut()});

function bootA(){
  $("LS").style.display="none";
  $("ADMIN").style.display="block";
  $("AA").src=AU.photoURL||"https://ui-avatars.com/api/?name=A";
  $("AN").textContent=AU.displayName||"Admin";
  goS("dashboard");
}

// NAV
function goS(s){
  var map={dashboard:"sDash",categories:"sCat",products:"sProd",payments:"sPay",orders:"sOrd",users:"sUsr"};
  var titles={dashboard:"Dashboard",categories:"Categories",products:"Products",payments:"Payment Methods",orders:"Orders",users:"Users"};
  var allSec=document.querySelectorAll(".a-sec");
  for(var i=0;i<allSec.length;i++){allSec[i].style.display="none";allSec[i].classList.remove("on");}
  var el=$(map[s]);
  if(el){el.style.display="block";el.classList.add("on");}
  var links=document.querySelectorAll("#SNAV a[data-s]");
  for(var j=0;j<links.length;j++){
    links[j].classList.remove("on");
    if(links[j].getAttribute("data-s")===s) links[j].classList.add("on");
  }
  $("PT").textContent=titles[s]||"";
  $("SIDE").classList.remove("open");
  $("SOV").classList.remove("open");
  if(s==="dashboard") lDash();
  else if(s==="categories") lCats();
  else if(s==="products") lProds();
  else if(s==="payments") lPays();
  else if(s==="orders") lOrds();
  else if(s==="users") lUsrs();
}

var slinks=document.querySelectorAll("#SNAV a[data-s]");
for(var si=0;si<slinks.length;si++){
  slinks[si].addEventListener("click",function(e){e.preventDefault();goS(this.getAttribute("data-s"))});
}
$("xSide").addEventListener("click",function(){$("SIDE").classList.toggle("open");$("SOV").classList.toggle("open")});
$("SOV").addEventListener("click",function(){$("SIDE").classList.remove("open");this.classList.remove("open")});

// DASHBOARD
function lDash(){
  serverGet(db.collection("users")).then(function(s){$("sU").textContent=s.size}).catch(function(){});
  serverGet(db.collection("orders")).then(function(s){
    $("sO").textContent=s.size;
    var os=[];
    s.forEach(function(d){os.push({id:d.id,d:d.data()})});
    os.sort(function(a,b){
      var at=a.d.createdAt?(a.d.createdAt.toMillis?a.d.createdAt.toMillis():new Date(a.d.createdAt).getTime()):0;
      var bt=b.d.createdAt?(b.d.createdAt.toMillis?b.d.createdAt.toMillis():new Date(b.d.createdAt).getTime()):0;
      return bt-at;
    });
    var tb=$("dOrd");
    if(!os.length){tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--g6)">No orders</td></tr>';return;}
    var h="",lim=Math.min(os.length,8);
    for(var i=0;i<lim;i++){
      var o=os[i].d,dt="";
      if(o.createdAt){
        if(o.createdAt.toDate) dt=o.createdAt.toDate().toLocaleDateString("en-US",{month:"short",day:"numeric"});
        else dt=new Date(o.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric"});
      }
      h+="<tr><td><strong>#"+os[i].id.substring(0,7).toUpperCase()+"</strong></td>"
        +"<td>"+esc(o.userName||o.userEmail||"?")+"</td>"
        +"<td>$"+parseFloat(o.total||0).toFixed(2)+"</td>"
        +'<td><span class="o-st '+(o.status||"pending")+'">'+(o.status||"pending")+"</span></td>"
        +"<td>"+dt+"</td></tr>";
    }
    tb.innerHTML=h;
  }).catch(function(){});
  db.collection("orders").where("status","==","pending").get({source:"server"})
    .then(function(s){$("sP").textContent=s.size}).catch(function(){});
  db.collection("orders").where("status","==","approved").get({source:"server"})
    .then(function(s){var r=0;s.forEach(function(d){r+=(+d.data().total)||0});$("sR").textContent="$"+r.toFixed(2)}).catch(function(){});
}

// CATEGORIES
function lCats(){
  $("CF").style.display="none";
  resetCF();
  serverGet(db.collection("categories")).then(function(snap){
    cats=[];
    snap.forEach(function(d){cats.push({id:d.id,name:d.data().name||"",icon:d.data().icon||"📁"})});
    cats.sort(function(a,b){return a.name.localeCompare(b.name)});
    console.log("Categories from server:",cats.length);
    renderCT();
  }).catch(function(e){toast("Error: "+e.message,"error")});
}

function resetCF(){
  $("cId").value="";$("cN").value="";$("cI").value="";
  $("CFH").textContent="Add Category";
  $("xSaveCat").disabled=false;$("xSaveCat").textContent="💾 Save";
}

function renderCT(){
  var tb=$("cTbl");
  if(!cats.length){tb.innerHTML='<tr><td colspan="3" style="text-align:center;padding:24px;color:var(--g6)">No categories.</td></tr>';return;}
  var h="";
  for(var i=0;i<cats.length;i++){
    var c=cats[i];
    h+='<tr><td style="font-size:22px">'+(c.icon||"📁")+'</td>'
      +'<td><strong>'+esc(c.name)+'</strong></td>'
      +'<td class="acts">'
      +'<button type="button" class="btn btn-s btn-sm" data-ec="'+c.id+'">✏️</button>'
      +'<button type="button" class="btn btn-r btn-sm" data-dc="'+c.id+'">🗑️</button></td></tr>';
  }
  tb.innerHTML=h;
  tb.querySelectorAll("[data-ec]").forEach(function(b){
    b.addEventListener("click",function(){
      var id=this.getAttribute("data-ec"),cat=cats.find(function(c){return c.id===id});
      if(!cat) return;
      resetCF();
      $("cId").value=id;$("cN").value=cat.name;$("cI").value=cat.icon||"";
      $("CFH").textContent="Edit Category";$("CF").style.display="block";$("cN").focus();
    });
  });
  tb.querySelectorAll("[data-dc]").forEach(function(b){
    b.addEventListener("click",function(){
      if(!confirm("Delete?")) return;
      db.collection("categories").doc(this.getAttribute("data-dc")).delete()
        .then(function(){toast("Deleted!","success");lCats()})
        .catch(function(e){toast(e.message,"error")});
    });
  });
}

$("xNewCat").addEventListener("click",function(){resetCF();$("CF").style.display="block";$("cN").focus()});
$("xCanCat").addEventListener("click",function(){$("CF").style.display="none";resetCF()});

$("xSaveCat").addEventListener("click",function(){
  var id=$("cId").value.trim(),nm=$("cN").value.trim(),ic=$("cI").value.trim()||"📁";
  if(!nm){toast("Name required","warning");$("cN").focus();return;}
  var btn=$("xSaveCat");btn.disabled=true;btn.textContent="Saving...";
  var data={name:nm,icon:ic,updatedAt:now()};
  var p;
  if(id){p=db.collection("categories").doc(id).update(data);}
  else{data.createdAt=now();p=db.collection("categories").add(data);}
  p.then(function(){
    toast(id?"Updated!":"Added!","success");
    $("CF").style.display="none";resetCF();lCats();
  }).catch(function(e){
    toast("Error: "+e.message,"error");
    btn.disabled=false;btn.textContent="💾 Save";
  });
});

// PRODUCTS
function lProds(){
  $("PF").style.display="none";
  resetPF();
  serverGet(db.collection("categories")).then(function(cs){
    cats=[];
    cs.forEach(function(d){cats.push({id:d.id,name:d.data().name||"",icon:d.data().icon||"📁"})});
    cats.sort(function(a,b){return a.name.localeCompare(b.name)});
    var sel=$("pCat"),opts='<option value="">-- Select --</option>';
    for(var i=0;i<cats.length;i++) opts+='<option value="'+cats[i].id+'">'+esc(cats[i].name)+'</option>';
    sel.innerHTML=opts;
    return serverGet(db.collection("products"));
  }).then(function(snap){
    prods=[];
    snap.forEach(function(d){
      var x=d.data();
      prods.push({id:d.id,name:x.name||"",price:x.price||0,imageURL:x.imageURL||"",description:x.description||"",categoryId:x.categoryId||"",customFields:x.customFields||[]});
    });
    console.log("Products from server:",prods.length);
    renderPT();
  }).catch(function(e){toast("Error: "+e.message,"error")});
}

function resetPF(){
  $("pId").value="";$("pN").value="";$("pPr").value="";$("pCat").value="";
  $("pImg").value="";$("pDsc").value="";$("DF").innerHTML="";
  $("PFH").textContent="Add Product";
  $("xSaveProd").disabled=false;$("xSaveProd").textContent="💾 Save";
}

function renderPT(){
  var tb=$("pTbl");
  if(!prods.length){tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--g6)">No products.</td></tr>';return;}
  var h="";
  for(var i=0;i<prods.length;i++){
    var p=prods[i],cn="N/A";
    for(var c=0;c<cats.length;c++){if(cats[c].id===p.categoryId){cn=cats[c].name;break;}}
    h+='<tr><td><img class="timg" src="'+(p.imageURL||"https://placehold.co/44?text=GC")+'" onerror="this.src=\'https://placehold.co/44\'"></td>'
      +'<td><strong>'+esc(p.name)+'</strong></td><td>'+esc(cn)+'</td><td>$'+parseFloat(p.price).toFixed(2)+'</td>'
      +'<td class="acts"><button type="button" class="btn btn-s btn-sm" data-ep="'+p.id+'">✏️</button>'
      +'<button type="button" class="btn btn-r btn-sm" data-dp="'+p.id+'">🗑️</button></td></tr>';
  }
  tb.innerHTML=h;

  tb.querySelectorAll("[data-ep]").forEach(function(b){
    b.addEventListener("click",function(){
      var id=this.getAttribute("data-ep"),pr=prods.find(function(p){return p.id===id});
      if(!pr) return;
      resetPF();
      $("pId").value=id;$("pN").value=pr.name;$("pPr").value=pr.price;
      $("pCat").value=pr.categoryId;$("pImg").value=pr.imageURL;$("pDsc").value=pr.description;
      $("PFH").textContent="Edit Product";
      (pr.customFields||[]).forEach(function(f){addDF(f.label,f.placeholder)});
      $("PF").style.display="block";$("pN").focus();
    });
  });
  tb.querySelectorAll("[data-dp]").forEach(function(b){
    b.addEventListener("click",function(){
      if(!confirm("Delete?")) return;
      db.collection("products").doc(this.getAttribute("data-dp")).delete()
        .then(function(){toast("Deleted!","success");lProds()})
        .catch(function(e){toast(e.message,"error")});
    });
  });
}

function addDF(l,p){
  var ls=$("DF"),r=document.createElement("div");r.className="df-row";
  var i1=document.createElement("input");i1.type="text";i1.placeholder="Label";i1.value=l||"";i1.className="dfl";
  var i2=document.createElement("input");i2.type="text";i2.placeholder="Placeholder";i2.value=p||"";i2.className="dfp";
  var rb=document.createElement("button");rb.type="button";rb.className="df-rm";rb.textContent="✕";
  rb.addEventListener("click",function(){r.remove()});
  r.appendChild(i1);r.appendChild(i2);r.appendChild(rb);ls.appendChild(r);
}

function gDF(){
  var fs=[];
  $("DF").querySelectorAll(".df-row").forEach(function(r){
    var l=r.querySelector(".dfl").value.trim(),p=r.querySelector(".dfp").value.trim();
    if(l) fs.push({label:l,placeholder:p||"Enter "+l});
  });
  return fs;
}

$("xNewProd").addEventListener("click",function(){resetPF();$("PF").style.display="block";$("pN").focus()});
$("xCanProd").addEventListener("click",function(){$("PF").style.display="none";resetPF()});
$("xAddF").addEventListener("click",function(){addDF("","")});

$("xSaveProd").addEventListener("click",function(){
  var id=$("pId").value.trim(),nm=$("pN").value.trim(),pr=parseFloat($("pPr").value);
  var cat=$("pCat").value,img=$("pImg").value.trim(),dsc=$("pDsc").value.trim(),flds=gDF();
  if(!nm){toast("Name required","warning");$("pN").focus();return;}
  if(isNaN(pr)||pr<0){toast("Valid price required","warning");$("pPr").focus();return;}
  if(!cat){toast("Select category","warning");$("pCat").focus();return;}

  var btn=$("xSaveProd");btn.disabled=true;btn.textContent="Saving...";
  var data={name:nm,price:pr,categoryId:cat,imageURL:img,description:dsc,customFields:flds,updatedAt:now()};
  var p;
  if(id){p=db.collection("products").doc(id).update(data);}
  else{data.createdAt=now();p=db.collection("products").add(data);}
  p.then(function(){
    toast(id?"Updated!":"Added!","success");
    $("PF").style.display="none";resetPF();lProds();
  }).catch(function(e){
    toast("Error: "+e.message,"error");
    btn.disabled=false;btn.textContent="💾 Save";
  });
});

// PAYMENTS
function lPays(){
  $("YF").style.display="none";resetYF();
  serverGet(db.collection("payment_methods")).then(function(snap){
    var ms=[];
    snap.forEach(function(d){var x=d.data();ms.push({id:d.id,name:x.name||"",imageURL:x.imageURL||"",instructions:x.instructions||""})});
    renderYT(ms);
  }).catch(function(e){toast("Error: "+e.message,"error")});
}

function resetYF(){
  $("yId").value="";$("yN").value="";$("yImg").value="";$("yInst").value="";
  $("YFH").textContent="Add Payment Method";
  $("xSavePay").disabled=false;$("xSavePay").textContent="💾 Save";
}

function renderYT(ms){
  var tb=$("yTbl");
  if(!ms.length){tb.innerHTML='<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--g6)">No methods.</td></tr>';return;}
  var h="";
  for(var i=0;i<ms.length;i++){
    var m=ms[i];
    h+='<tr><td><img class="timg" src="'+(m.imageURL||"https://placehold.co/44?text=Pay")+'" onerror="this.src=\'https://placehold.co/44\'"></td>'
      +'<td><strong>'+esc(m.name)+'</strong></td><td>'+esc(m.instructions||"-")+'</td>'
      +'<td class="acts"><button type="button" class="btn btn-s btn-sm" data-ey="'+m.id+'">✏️</button>'
      +'<button type="button" class="btn btn-r btn-sm" data-dy="'+m.id+'">🗑️</button></td></tr>';
  }
  tb.innerHTML=h;

  tb.querySelectorAll("[data-ey]").forEach(function(b){
    b.addEventListener("click",function(){
      var pid=this.getAttribute("data-ey");
      db.collection("payment_methods").doc(pid).get({source:"server"}).then(function(doc){
        if(!doc.exists) return;var d=doc.data();
        resetYF();
        $("yId").value=pid;$("yN").value=d.name||"";$("yImg").value=d.imageURL||"";$("yInst").value=d.instructions||"";
        $("YFH").textContent="Edit Method";$("YF").style.display="block";$("yN").focus();
      }).catch(function(){
        db.collection("payment_methods").doc(pid).get().then(function(doc){
          if(!doc.exists) return;var d=doc.data();
          resetYF();
          $("yId").value=pid;$("yN").value=d.name||"";$("yImg").value=d.imageURL||"";$("yInst").value=d.instructions||"";
          $("YFH").textContent="Edit Method";$("YF").style.display="block";$("yN").focus();
        });
      });
    });
  });
  tb.querySelectorAll("[data-dy]").forEach(function(b){
    b.addEventListener("click",function(){
      if(!confirm("Delete?")) return;
      db.collection("payment_methods").doc(this.getAttribute("data-dy")).delete()
        .then(function(){toast("Deleted!","success");lPays()})
        .catch(function(e){toast(e.message,"error")});
    });
  });
}

$("xNewPay").addEventListener("click",function(){resetYF();$("YF").style.display="block";$("yN").focus()});
$("xCanPay").addEventListener("click",function(){$("YF").style.display="none";resetYF()});

$("xSavePay").addEventListener("click",function(){
  var id=$("yId").value.trim(),nm=$("yN").value.trim(),img=$("yImg").value.trim(),inst=$("yInst").value.trim();
  if(!nm){toast("Name required","warning");$("yN").focus();return;}
  var btn=$("xSavePay");btn.disabled=true;btn.textContent="Saving...";
  var data={name:nm,imageURL:img,instructions:inst,updatedAt:now()};
  var p;
  if(id){p=db.collection("payment_methods").doc(id).update(data);}
  else{data.createdAt=now();p=db.collection("payment_methods").add(data);}
  p.then(function(){
    toast(id?"Updated!":"Added!","success");
    $("YF").style.display="none";resetYF();lPays();
  }).catch(function(e){
    toast("Error: "+e.message,"error");
    btn.disabled=false;btn.textContent="💾 Save";
  });
});

// ORDERS
$("oFlt").addEventListener("change",function(){lOrds()});

function lOrds(){
  serverGet(db.collection("orders")).then(function(snap){
    var os=[];
    snap.forEach(function(d){os.push({id:d.id,d:d.data()})});
    var flt=$("oFlt").value;
    if(flt!=="all") os=os.filter(function(o){return o.d.status===flt});
    os.sort(function(a,b){
      var at=a.d.createdAt?(a.d.createdAt.toMillis?a.d.createdAt.toMillis():new Date(a.d.createdAt).getTime()):0;
      var bt=b.d.createdAt?(b.d.createdAt.toMillis?b.d.createdAt.toMillis():new Date(b.d.createdAt).getTime()):0;
      return bt-at;
    });
    var tb=$("oTbl");
    if(!os.length){tb.innerHTML='<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--g6)">No orders</td></tr>';return;}
    var h="";
    for(var i=0;i<os.length;i++){
      var o=os[i].d,did=os[i].id,dt="";
      if(o.createdAt){
        if(o.createdAt.toDate) dt=o.createdAt.toDate().toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
        else dt=new Date(o.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric"});
      }
      var il=[];(o.items||[]).forEach(function(it){il.push(esc(it.name)+" ×"+it.quantity)});
      var ss=o.paymentScreenshot?'<img class="ss-th" src="'+o.paymentScreenshot+'" data-ssp="1" alt>':"N/A";
      var st=o.status||"pending";
      h+='<tr><td><strong>#'+did.substring(0,7).toUpperCase()+'</strong></td>'
        +'<td><div style="font-weight:600;font-size:12px">'+esc(o.userName||"?")+'</div><div style="font-size:10px;color:var(--g6)">'+esc(o.userEmail||"")+'</div></td>'
        +'<td style="max-width:160px;font-size:11px">'+il.join(", ")+'</td>'
        +'<td><strong>$'+parseFloat(o.total||0).toFixed(2)+'</strong></td>'
        +'<td style="font-size:12px">'+esc(o.paymentMethodName||"?")+'</td>'
        +'<td>'+ss+'</td>'
        +'<td><span class="o-st '+st+'">'+st+'</span></td>'
        +'<td style="font-size:11px">'+dt+'</td>'
        +'<td><select data-oid="'+did+'" style="padding:5px 8px;border:2px solid var(--g4);border-radius:6px;font-size:11px">'
        +'<option value="pending"'+(st==="pending"?" selected":"")+'>Pending</option>'
        +'<option value="approved"'+(st==="approved"?" selected":"")+'>Approved</option>'
        +'<option value="rejected"'+(st==="rejected"?" selected":"")+'>Rejected</option></select></td></tr>';
    }
    tb.innerHTML=h;

    tb.querySelectorAll("[data-oid]").forEach(function(sel){
      sel.addEventListener("change",function(){
        var oid=this.getAttribute("data-oid"),ns=this.value;
        db.collection("orders").doc(oid).update({status:ns,updatedAt:now()})
          .then(function(){toast("→ "+ns,"success");lOrds()})
          .catch(function(e){toast(e.message,"error")});
      });
    });
    tb.querySelectorAll("[data-ssp]").forEach(function(img){
      img.addEventListener("click",function(){$("IPI").src=this.src;$("IP").classList.add("open")});
    });
  }).catch(function(e){toast("Error: "+e.message,"error")});
}

// USERS
function lUsrs(){
  serverGet(db.collection("users")).then(function(snap){
    var us=[];
    snap.forEach(function(d){us.push({id:d.id,d:d.data()})});
    us.sort(function(a,b){
      var at=a.d.createdAt?(a.d.createdAt.toMillis?a.d.createdAt.toMillis():new Date(a.d.createdAt).getTime()):0;
      var bt=b.d.createdAt?(b.d.createdAt.toMillis?b.d.createdAt.toMillis():new Date(b.d.createdAt).getTime()):0;
      return bt-at;
    });
    var tb=$("uTbl");
    if(!us.length){tb.innerHTML='<tr><td colspan="4" style="text-align:center;padding:24px">No users</td></tr>';return;}
    var h="";
    for(var i=0;i<us.length;i++){
      var u=us[i].d,dt="";
      if(u.createdAt){
        if(u.createdAt.toDate) dt=u.createdAt.toDate().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
        else dt=new Date(u.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
      }
      h+='<tr><td><img class="timg" src="'+(u.photoURL||"https://ui-avatars.com/api/?name="+encodeURIComponent(u.name||"U"))+'" style="border-radius:50%" onerror="this.src=\'https://ui-avatars.com/api/?name=U\'"></td>'
        +'<td><strong>'+esc(u.name)+'</strong></td><td>'+esc(u.email)+'</td><td>'+dt+'</td></tr>';
    }
    tb.innerHTML=h;
  }).catch(function(e){console.error(e)});
}

// IMG PREVIEW
$("IPX").addEventListener("click",function(){$("IP").classList.remove("open")});
$("IP").addEventListener("click",function(e){if(e.target===this) this.classList.remove("open")});
document.addEventListener("keydown",function(e){if(e.key==="Escape") $("IP").classList.remove("open")});

console.log("✅ admin.js loaded");
})();
