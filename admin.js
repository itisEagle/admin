// admin.js - Fixed version
(function(){
"use strict";
var AU=null,cats=[],prods=[];
var $=function(id){return document.getElementById(id)};
function esc(t){if(!t)return"";var d=document.createElement("div");d.textContent=t;return d.innerHTML}
function toast(m,ty){var c=$("TC"),e=document.createElement("div");e.className="toast "+(ty||"info");e.innerHTML='<span class="t-ico">'+({success:"✅",error:"❌",warning:"⚠️",info:"ℹ️"}[ty]||"ℹ️")+'</span><span class="t-msg">'+m+'</span>';c.appendChild(e);setTimeout(function(){e.remove()},3e3)}
function now(){return new Date().toISOString()}

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
  var b=this;
  b.disabled=true;
  b.textContent="Signing in...";
  $("LE").style.display="none";
  auth.signInWithPopup(googleProvider).then(function(){
    b.disabled=false;
    b.innerHTML='<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"> Continue with Google';
  }).catch(function(e){
    b.disabled=false;
    b.innerHTML='<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"> Continue with Google';
    $("LE").textContent=e.message;
    $("LE").style.display="block";
  });
});

$("xLogout").addEventListener("click",function(e){
  e.preventDefault();
  auth.signOut();
});

function bootA(){
  $("LS").style.display="none";
  $("ADMIN").style.display="block";
  $("AA").src=AU.photoURL||"https://ui-avatars.com/api/?name=A";
  $("AN").textContent=AU.displayName||"Admin";
  goS("dashboard");
}

// NAVIGATION
function goS(s){
  var map={dashboard:"sDash",categories:"sCat",products:"sProd",payments:"sPay",orders:"sOrd",users:"sUsr"};
  var titles={dashboard:"Dashboard",categories:"Categories",products:"Products",payments:"Payment Methods",orders:"Orders",users:"Users"};

  var allSec=document.querySelectorAll(".a-sec");
  for(var i=0;i<allSec.length;i++){
    allSec[i].style.display="none";
    allSec[i].classList.remove("on");
  }

  var el=$(map[s]);
  if(el){
    el.style.display="block";
    el.classList.add("on");
  }

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

// Sidebar links
var slinks=document.querySelectorAll("#SNAV a[data-s]");
for(var si=0;si<slinks.length;si++){
  slinks[si].addEventListener("click",function(e){
    e.preventDefault();
    goS(this.getAttribute("data-s"));
  });
}

$("xSide").addEventListener("click",function(){
  $("SIDE").classList.toggle("open");
  $("SOV").classList.toggle("open");
});
$("SOV").addEventListener("click",function(){
  $("SIDE").classList.remove("open");
  this.classList.remove("open");
});

// ========== DASHBOARD ==========
function lDash(){
  db.collection("users").get().then(function(s){$("sU").textContent=s.size}).catch(function(){});

  db.collection("orders").get().then(function(s){
    $("sO").textContent=s.size;
    var os=[];
    s.forEach(function(d){os.push({id:d.id,d:d.data()})});
    os.sort(function(a,b){
      var at=a.d.createdAt?(a.d.createdAt.toMillis?a.d.createdAt.toMillis():new Date(a.d.createdAt).getTime()):0;
      var bt=b.d.createdAt?(b.d.createdAt.toMillis?b.d.createdAt.toMillis():new Date(b.d.createdAt).getTime()):0;
      return bt-at;
    });
    var tb=$("dOrd");
    if(!os.length){
      tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--g6)">No orders</td></tr>';
      return;
    }
    var h="",lim=Math.min(os.length,8);
    for(var i=0;i<lim;i++){
      var o=os[i].d;
      var dt="";
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

  db.collection("orders").where("status","==","pending").get()
    .then(function(s){$("sP").textContent=s.size}).catch(function(){});

  db.collection("orders").where("status","==","approved").get()
    .then(function(s){
      var r=0;
      s.forEach(function(d){r+=(+d.data().total)||0});
      $("sR").textContent="$"+r.toFixed(2);
    }).catch(function(){});
}

// ========== CATEGORIES ==========
function lCats(){
  $("CF").style.display="none";
  resetCatForm();

  db.collection("categories").get().then(function(snap){
    cats=[];
    snap.forEach(function(d){
      cats.push({id:d.id,name:d.data().name||"",icon:d.data().icon||"📁"});
    });
    cats.sort(function(a,b){return a.name.localeCompare(b.name)});
    renderCatTable();
  }).catch(function(e){
    toast("Error loading categories: "+e.message,"error");
  });
}

function resetCatForm(){
  $("cId").value="";
  $("cN").value="";
  $("cI").value="";
  $("CFH").textContent="Add Category";
  $("xSaveCat").disabled=false;
  $("xSaveCat").textContent="💾 Save";
}

function renderCatTable(){
  var tb=$("cTbl");
  if(!cats.length){
    tb.innerHTML='<tr><td colspan="3" style="text-align:center;padding:24px;color:var(--g6)">No categories. Click + Add.</td></tr>';
    return;
  }
  var h="";
  for(var i=0;i<cats.length;i++){
    var c=cats[i];
    h+='<tr>'
      +'<td style="font-size:22px">'+(c.icon||"📁")+'</td>'
      +'<td><strong>'+esc(c.name)+'</strong></td>'
      +'<td class="acts">'
      +'<button type="button" class="btn btn-s btn-sm" data-ec="'+c.id+'">✏️</button>'
      +'<button type="button" class="btn btn-r btn-sm" data-dc="'+c.id+'">🗑️</button>'
      +'</td></tr>';
  }
  tb.innerHTML=h;

  // Edit handlers
  var ebs=tb.querySelectorAll("[data-ec]");
  for(var j=0;j<ebs.length;j++){
    ebs[j].addEventListener("click",function(){
      var id=this.getAttribute("data-ec");
      var cat=null;
      for(var x=0;x<cats.length;x++){if(cats[x].id===id){cat=cats[x];break;}}
      if(!cat) return;
      resetCatForm();
      $("cId").value=id;
      $("cN").value=cat.name;
      $("cI").value=cat.icon||"";
      $("CFH").textContent="Edit Category";
      $("CF").style.display="block";
      $("cN").focus();
    });
  }

  // Delete handlers
  var dbs=tb.querySelectorAll("[data-dc]");
  for(var k=0;k<dbs.length;k++){
    dbs[k].addEventListener("click",function(){
      if(!confirm("Delete this category?")) return;
      var delId=this.getAttribute("data-dc");
      db.collection("categories").doc(delId).delete().then(function(){
        toast("Deleted!","success");
        lCats();
      }).catch(function(e){
        toast("Error: "+e.message,"error");
      });
    });
  }
}

$("xNewCat").addEventListener("click",function(){
  resetCatForm();
  $("CF").style.display="block";
  $("cN").focus();
});

$("xCanCat").addEventListener("click",function(){
  $("CF").style.display="none";
  resetCatForm();
});

$("xSaveCat").addEventListener("click",function(){
  var id=$("cId").value.trim();
  var nm=$("cN").value.trim();
  var ic=$("cI").value.trim()||"📁";

  if(!nm){
    toast("Name required","warning");
    $("cN").focus();
    return;
  }

  var btn=$("xSaveCat");
  btn.disabled=true;
  btn.textContent="Saving...";

  var saveData={name:nm, icon:ic, updatedAt:now()};
  var promise;

  if(id){
    promise=db.collection("categories").doc(id).update(saveData);
  } else {
    saveData.createdAt=now();
    promise=db.collection("categories").add(saveData);
  }

  promise.then(function(){
    toast(id?"Updated!":"Added!","success");
    $("CF").style.display="none";
    resetCatForm();
    lCats();
  }).catch(function(e){
    toast("Error: "+e.message,"error");
    btn.disabled=false;
    btn.textContent="💾 Save";
  });
});

// ========== PRODUCTS ==========
function lProds(){
  $("PF").style.display="none";
  resetProdForm();

  // Load categories for dropdown first
  db.collection("categories").get().then(function(cs){
    cats=[];
    cs.forEach(function(d){
      cats.push({id:d.id,name:d.data().name||"",icon:d.data().icon||"📁"});
    });
    cats.sort(function(a,b){return a.name.localeCompare(b.name)});

    // Build dropdown
    var sel=$("pCat");
    var opts='<option value="">-- Select Category --</option>';
    for(var i=0;i<cats.length;i++){
      opts+='<option value="'+cats[i].id+'">'+esc(cats[i].name)+'</option>';
    }
    sel.innerHTML=opts;

    // Now load products
    return db.collection("products").get();
  }).then(function(snap){
    prods=[];
    snap.forEach(function(d){
      var x=d.data();
      prods.push({
        id:d.id,
        name:x.name||"",
        price:x.price||0,
        imageURL:x.imageURL||"",
        description:x.description||"",
        categoryId:x.categoryId||"",
        customFields:x.customFields||[]
      });
    });
    renderProdTable();
  }).catch(function(e){
    toast("Error loading: "+e.message,"error");
  });
}

function resetProdForm(){
  $("pId").value="";
  $("pN").value="";
  $("pPr").value="";
  $("pCat").value="";
  $("pImg").value="";
  $("pDsc").value="";
  $("DF").innerHTML="";
  $("PFH").textContent="Add Product";
  $("xSaveProd").disabled=false;
  $("xSaveProd").textContent="💾 Save";
}

function renderProdTable(){
  var tb=$("pTbl");
  if(!prods.length){
    tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--g6)">No products yet.</td></tr>';
    return;
  }
  var h="";
  for(var i=0;i<prods.length;i++){
    var p=prods[i];
    var cn="N/A";
    for(var c=0;c<cats.length;c++){
      if(cats[c].id===p.categoryId){cn=cats[c].name;break;}
    }
    h+='<tr>'
      +'<td><img class="timg" src="'+(p.imageURL||"https://placehold.co/44?text=GC")+'" onerror="this.src=\'https://placehold.co/44\'"></td>'
      +'<td><strong>'+esc(p.name)+'</strong></td>'
      +'<td>'+esc(cn)+'</td>'
      +'<td>$'+parseFloat(p.price).toFixed(2)+'</td>'
      +'<td class="acts">'
      +'<button type="button" class="btn btn-s btn-sm" data-ep="'+p.id+'">✏️</button>'
      +'<button type="button" class="btn btn-r btn-sm" data-dp="'+p.id+'">🗑️</button>'
      +'</td></tr>';
  }
  tb.innerHTML=h;

  // Edit
  var ebs=tb.querySelectorAll("[data-ep]");
  for(var j=0;j<ebs.length;j++){
    ebs[j].addEventListener("click",function(){
      var id=this.getAttribute("data-ep");
      var pr=null;
      for(var x=0;x<prods.length;x++){if(prods[x].id===id){pr=prods[x];break;}}
      if(!pr) return;
      resetProdForm();
      $("pId").value=id;
      $("pN").value=pr.name;
      $("pPr").value=pr.price;
      $("pCat").value=pr.categoryId;
      $("pImg").value=pr.imageURL;
      $("pDsc").value=pr.description;
      $("PFH").textContent="Edit Product";
      // Load custom fields
      var flds=pr.customFields||[];
      for(var f=0;f<flds.length;f++){
        addDynField(flds[f].label, flds[f].placeholder);
      }
      $("PF").style.display="block";
      $("pN").focus();
    });
  }

  // Delete
  var dbs=tb.querySelectorAll("[data-dp]");
  for(var k=0;k<dbs.length;k++){
    dbs[k].addEventListener("click",function(){
      if(!confirm("Delete this product?")) return;
      var delId=this.getAttribute("data-dp");
      db.collection("products").doc(delId).delete().then(function(){
        toast("Deleted!","success");
        lProds();
      }).catch(function(e){
        toast("Error: "+e.message,"error");
      });
    });
  }
}

function addDynField(label, placeholder){
  var container=$("DF");
  var row=document.createElement("div");
  row.className="df-row";

  var inp1=document.createElement("input");
  inp1.type="text";
  inp1.placeholder="Field label (e.g. Player ID)";
  inp1.value=label||"";
  inp1.className="dfl";

  var inp2=document.createElement("input");
  inp2.type="text";
  inp2.placeholder="Placeholder text";
  inp2.value=placeholder||"";
  inp2.className="dfp";

  var rmBtn=document.createElement("button");
  rmBtn.type="button";
  rmBtn.className="df-rm";
  rmBtn.textContent="✕";
  rmBtn.addEventListener("click",function(){
    row.remove();
  });

  row.appendChild(inp1);
  row.appendChild(inp2);
  row.appendChild(rmBtn);
  container.appendChild(row);
}

function collectDynFields(){
  var fields=[];
  var rows=$("DF").querySelectorAll(".df-row");
  for(var i=0;i<rows.length;i++){
    var label=rows[i].querySelector(".dfl").value.trim();
    var ph=rows[i].querySelector(".dfp").value.trim();
    if(label){
      fields.push({label:label, placeholder:ph||"Enter "+label});
    }
  }
  return fields;
}

$("xNewProd").addEventListener("click",function(){
  resetProdForm();
  $("PF").style.display="block";
  $("pN").focus();
});

$("xCanProd").addEventListener("click",function(){
  $("PF").style.display="none";
  resetProdForm();
});

$("xAddF").addEventListener("click",function(){
  addDynField("","");
});

$("xSaveProd").addEventListener("click",function(){
  var id=$("pId").value.trim();
  var name=$("pN").value.trim();
  var price=parseFloat($("pPr").value);
  var catId=$("pCat").value;
  var imgUrl=$("pImg").value.trim();
  var desc=$("pDsc").value.trim();
  var customFields=collectDynFields();

  if(!name){toast("Name required","warning");$("pN").focus();return;}
  if(isNaN(price)||price<0){toast("Valid price required","warning");$("pPr").focus();return;}
  if(!catId){toast("Select a category","warning");$("pCat").focus();return;}

  var btn=$("xSaveProd");
  btn.disabled=true;
  btn.textContent="Saving...";

  // Build data object fresh each time
  var saveData={
    name:name,
    price:price,
    categoryId:catId,
    imageURL:imgUrl,
    description:desc,
    customFields:customFields,
    updatedAt:now()
  };

  var promise;
  if(id){
    // Update existing
    promise=db.collection("products").doc(id).update(saveData);
  } else {
    // Add new - add createdAt
    saveData.createdAt=now();
    promise=db.collection("products").add(saveData);
  }

  promise.then(function(){
    toast(id?"Product updated!":"Product added!","success");
    $("PF").style.display="none";
    resetProdForm();
    lProds();
  }).catch(function(e){
    console.error("Save product error:",e);
    toast("Error: "+e.message,"error");
    // Re-enable button on error
    btn.disabled=false;
    btn.textContent="💾 Save";
  });
});

// ========== PAYMENT METHODS ==========
function lPays(){
  $("YF").style.display="none";
  resetPayForm();

  db.collection("payment_methods").get().then(function(snap){
    var methods=[];
    snap.forEach(function(d){
      var x=d.data();
      methods.push({id:d.id,name:x.name||"",imageURL:x.imageURL||"",instructions:x.instructions||""});
    });
    renderPayTable(methods);
  }).catch(function(e){
    toast("Error: "+e.message,"error");
  });
}

function resetPayForm(){
  $("yId").value="";
  $("yN").value="";
  $("yImg").value="";
  $("yInst").value="";
  $("YFH").textContent="Add Payment Method";
  $("xSavePay").disabled=false;
  $("xSavePay").textContent="💾 Save";
}

function renderPayTable(methods){
  var tb=$("yTbl");
  if(!methods.length){
    tb.innerHTML='<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--g6)">No payment methods yet.</td></tr>';
    return;
  }
  var h="";
  for(var i=0;i<methods.length;i++){
    var m=methods[i];
    h+='<tr>'
      +'<td><img class="timg" src="'+(m.imageURL||"https://placehold.co/44?text=Pay")+'" onerror="this.src=\'https://placehold.co/44\'"></td>'
      +'<td><strong>'+esc(m.name)+'</strong></td>'
      +'<td>'+esc(m.instructions||"-")+'</td>'
      +'<td class="acts">'
      +'<button type="button" class="btn btn-s btn-sm" data-ey="'+m.id+'">✏️</button>'
      +'<button type="button" class="btn btn-r btn-sm" data-dy="'+m.id+'">🗑️</button>'
      +'</td></tr>';
  }
  tb.innerHTML=h;

  // Edit
  var ebs=tb.querySelectorAll("[data-ey]");
  for(var j=0;j<ebs.length;j++){
    ebs[j].addEventListener("click",function(){
      var pid=this.getAttribute("data-ey");
      db.collection("payment_methods").doc(pid).get().then(function(doc){
        if(!doc.exists) return;
        var d=doc.data();
        resetPayForm();
        $("yId").value=pid;
        $("yN").value=d.name||"";
        $("yImg").value=d.imageURL||"";
        $("yInst").value=d.instructions||"";
        $("YFH").textContent="Edit Payment Method";
        $("YF").style.display="block";
        $("yN").focus();
      });
    });
  }

  // Delete
  var dbs=tb.querySelectorAll("[data-dy]");
  for(var k=0;k<dbs.length;k++){
    dbs[k].addEventListener("click",function(){
      if(!confirm("Delete this payment method?")) return;
      var delId=this.getAttribute("data-dy");
      db.collection("payment_methods").doc(delId).delete().then(function(){
        toast("Deleted!","success");
        lPays();
      }).catch(function(e){
        toast("Error: "+e.message,"error");
      });
    });
  }
}

$("xNewPay").addEventListener("click",function(){
  resetPayForm();
  $("YF").style.display="block";
  $("yN").focus();
});

$("xCanPay").addEventListener("click",function(){
  $("YF").style.display="none";
  resetPayForm();
});

$("xSavePay").addEventListener("click",function(){
  var id=$("yId").value.trim();
  var name=$("yN").value.trim();
  var imgUrl=$("yImg").value.trim();
  var inst=$("yInst").value.trim();

  if(!name){toast("Name required","warning");$("yN").focus();return;}

  var btn=$("xSavePay");
  btn.disabled=true;
  btn.textContent="Saving...";

  var saveData={
    name:name,
    imageURL:imgUrl,
    instructions:inst,
    updatedAt:now()
  };

  var promise;
  if(id){
    promise=db.collection("payment_methods").doc(id).update(saveData);
  } else {
    saveData.createdAt=now();
    promise=db.collection("payment_methods").add(saveData);
  }

  promise.then(function(){
    toast(id?"Updated!":"Added!","success");
    $("YF").style.display="none";
    resetPayForm();
    lPays();
  }).catch(function(e){
    toast("Error: "+e.message,"error");
    btn.disabled=false;
    btn.textContent="💾 Save";
  });
});

// ========== ORDERS ==========
$("oFlt").addEventListener("change",function(){lOrds()});

function lOrds(){
  db.collection("orders").get().then(function(snap){
    var os=[];
    snap.forEach(function(d){os.push({id:d.id,d:d.data()})});

    var flt=$("oFlt").value;
    if(flt!=="all"){
      os=os.filter(function(o){return o.d.status===flt});
    }

    os.sort(function(a,b){
      var at=a.d.createdAt?(a.d.createdAt.toMillis?a.d.createdAt.toMillis():new Date(a.d.createdAt).getTime()):0;
      var bt=b.d.createdAt?(b.d.createdAt.toMillis?b.d.createdAt.toMillis():new Date(b.d.createdAt).getTime()):0;
      return bt-at;
    });

    var tb=$("oTbl");
    if(!os.length){
      tb.innerHTML='<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--g6)">No orders found</td></tr>';
      return;
    }

    var h="";
    for(var i=0;i<os.length;i++){
      var o=os[i].d;
      var did=os[i].id;
      var dt="";
      if(o.createdAt){
        if(o.createdAt.toDate) dt=o.createdAt.toDate().toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
        else dt=new Date(o.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric"});
      }

      var items=o.items||[];
      var itemNames=[];
      for(var j=0;j<items.length;j++){
        itemNames.push(esc(items[j].name)+" ×"+items[j].quantity);
      }

      var ssHtml=o.paymentScreenshot
        ?'<img class="ss-th" src="'+o.paymentScreenshot+'" data-ssp="1" alt="proof">'
        :"N/A";

      var st=o.status||"pending";

      h+='<tr>'
        +'<td><strong>#'+did.substring(0,7).toUpperCase()+'</strong></td>'
        +'<td><div style="font-weight:600;font-size:12px">'+esc(o.userName||"?")+'</div><div style="font-size:10px;color:var(--g6)">'+esc(o.userEmail||"")+'</div></td>'
        +'<td style="max-width:160px;font-size:11px">'+itemNames.join(", ")+'</td>'
        +'<td><strong>$'+parseFloat(o.total||0).toFixed(2)+'</strong></td>'
        +'<td style="font-size:12px">'+esc(o.paymentMethodName||"?")+'</td>'
        +'<td>'+ssHtml+'</td>'
        +'<td><span class="o-st '+st+'">'+st+'</span></td>'
        +'<td style="font-size:11px">'+dt+'</td>'
        +'<td><select data-oid="'+did+'" style="padding:5px 8px;border:2px solid var(--g4);border-radius:6px;font-size:11px">'
        +'<option value="pending"'+(st==="pending"?" selected":"")+'>Pending</option>'
        +'<option value="approved"'+(st==="approved"?" selected":"")+'>Approved</option>'
        +'<option value="rejected"'+(st==="rejected"?" selected":"")+'>Rejected</option>'
        +'</select></td></tr>';
    }
    tb.innerHTML=h;

    // Status change
    var sels=tb.querySelectorAll("[data-oid]");
    for(var k=0;k<sels.length;k++){
      sels[k].addEventListener("change",function(){
        var orderId=this.getAttribute("data-oid");
        var newStatus=this.value;
        db.collection("orders").doc(orderId).update({
          status:newStatus,
          updatedAt:now()
        }).then(function(){
          toast("Status → "+newStatus,"success");
          lOrds();
        }).catch(function(e){
          toast("Error: "+e.message,"error");
        });
      });
    }

    // Screenshot preview
    var thumbs=tb.querySelectorAll("[data-ssp]");
    for(var m=0;m<thumbs.length;m++){
      thumbs[m].addEventListener("click",function(){
        $("IPI").src=this.src;
        $("IP").classList.add("open");
      });
    }

  }).catch(function(e){
    toast("Error loading orders: "+e.message,"error");
  });
}

// ========== USERS ==========
function lUsrs(){
  db.collection("users").get().then(function(snap){
    var users=[];
    snap.forEach(function(d){users.push({id:d.id,d:d.data()})});

    users.sort(function(a,b){
      var at=a.d.createdAt?(a.d.createdAt.toMillis?a.d.createdAt.toMillis():new Date(a.d.createdAt).getTime()):0;
      var bt=b.d.createdAt?(b.d.createdAt.toMillis?b.d.createdAt.toMillis():new Date(b.d.createdAt).getTime()):0;
      return bt-at;
    });

    var tb=$("uTbl");
    if(!users.length){
      tb.innerHTML='<tr><td colspan="4" style="text-align:center;padding:24px">No users</td></tr>';
      return;
    }

    var h="";
    for(var i=0;i<users.length;i++){
      var u=users[i].d;
      var dt="";
      if(u.createdAt){
        if(u.createdAt.toDate) dt=u.createdAt.toDate().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
        else dt=new Date(u.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
      }
      h+='<tr>'
        +'<td><img class="timg" src="'+(u.photoURL||"https://ui-avatars.com/api/?name="+encodeURIComponent(u.name||"U"))+'" style="border-radius:50%" onerror="this.src=\'https://ui-avatars.com/api/?name=U\'"></td>'
        +'<td><strong>'+esc(u.name)+'</strong></td>'
        +'<td>'+esc(u.email)+'</td>'
        +'<td>'+dt+'</td></tr>';
    }
    tb.innerHTML=h;
  }).catch(function(e){
    console.error("Users load error:",e);
  });
}

// ========== IMAGE PREVIEW ==========
$("IPX").addEventListener("click",function(){
  $("IP").classList.remove("open");
});
$("IP").addEventListener("click",function(e){
  if(e.target===this) this.classList.remove("open");
});
document.addEventListener("keydown",function(e){
  if(e.key==="Escape") $("IP").classList.remove("open");
});

console.log("✅ admin.js ready");
})();