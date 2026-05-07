((a,b)=>{a[b]=a[b]||{}})(self,"$__dart_deferred_initializers__")
$__dart_deferred_initializers__.current=function(a,b,c,$){var B,C,E,F,A={
bN(d){var x=$.mo.k(0,d)
if(x==null){x=new A.eJ(d,B.f([],y.z))
$.mo.i(0,d,x)}return x},
eK:function eK(d,e){this.a=d
this.b=e},
cZ:function cZ(d,e){this.c=d
this.a=e},
fY:function fY(d,e,f,g,h,i,j){var _=this
_.d$=d
_.e$=e
_.f$=f
_.cy=null
_.db=g
_.c=_.b=_.a=null
_.d=h
_.e=null
_.f=i
_.w=_.r=null
_.x=j
_.Q=_.z=_.y=null
_.as=!1
_.at=!0
_.ax=!1
_.CW=null
_.cx=!1},
b2:function b2(d,e,f){var _=this
_.w=d
_.x=e
_.y=null
_.z=f
_.d=$
_.c=_.b=_.a=null},
eJ:function eJ(d,e){var _=this
_.a=d
_.e=_.d=_.c=_.b=$
_.f=e
_.r=!0},
hU:function hU(){},
bK(d,e){return new A.hJ(e,d,null)},
hy:function hy(d,e,f,g,h,i){var _=this
_.f=d
_.w=e
_.x=f
_.y=g
_.Q=h
_.a=i},
hL:function hL(d,e,f,g,h,i){var _=this
_.c=d
_.d=e
_.e=f
_.x=g
_.z=h
_.a=i},
hz:function hz(d,e,f,g,h){var _=this
_.c=d
_.d=e
_.e=f
_.at=g
_.a=h},
hJ:function hJ(d,e,f){this.c=d
this.Q=e
this.a=f},
ia:function ia(d,e){this.a=d
this.b=e},
ee:function ee(d,e){this.a=d
this.b=e},
dd:function dd(d,e){this.b=d
this.a=e},
hd:function hd(d,e,f,g,h,i,j){var _=this
_.d$=d
_.e$=e
_.f$=f
_.cy=null
_.db=g
_.c=_.b=_.a=null
_.d=h
_.e=null
_.f=i
_.w=_.r=null
_.x=j
_.Q=_.z=_.y=null
_.as=!1
_.at=!0
_.ax=!1
_.CW=null
_.cx=!1},
f8:function f8(d,e){this.c=d
this.a=e},
fI:function fI(d,e){this.c=d
this.a=e},
e3:function e3(d,e,f){this.c=d
this.d=e
this.a=f},
pP(){return new A.bn(null)},
bn:function bn(d){this.a=d},
fL:function fL(){this.d=!1
this.c=null},
jn:function jn(d){this.a=d},
jm:function jm(d){this.a=d},
pr(d){var x,w,v=y.N,u=B.N(v,v)
for(x=0;x<B.ar(d.length);++x){w=B.G(d.item(x))
u.i(0,B.w(w.name),B.w(w.value))}return u},
n7(d){var x=null
return new B.el(d,x,x,x,x)}},D
B=c[0]
C=c[2]
E=c[8]
F=c[7]
A=a.updateHolder(c[5],A)
D=c[11]
A.eK.prototype={
b0(){return"AttachTarget."+this.b}}
A.cZ.prototype={
a9(){var x=B.bX(y.h),w=($.V+1)%16777215
$.V=w
return new A.fY(null,!1,!1,x,w,this,C.i)}}
A.fY.prototype={
aH(){var x=this.f
x.toString
y.U.a(x)
return D.Y},
ak(){var x,w,v=this.f
v.toString
y.U.a(v)
x=this.e
x.toString
x=new A.b2(B.f([],y.O),D.t,x)
x.bs("")
w=A.bN(x.x)
C.b.m(w.f,x)
w.r=!0
x.sdL(v.c)
return x},
aD(d){var x
y.j.a(d)
x=this.f
x.toString
y.U.a(x)
d.shy(D.t)
d.sdL(x.c)},
au(){var x,w
this.ey()
x=this.d$
x.toString
y.j.a(x)
w=A.bN(x.x)
C.b.H(w.f,x)
w.aS()}}
A.b2.prototype={
shy(d){var x=this,w=x.x
if(w===d)return
w=A.bN(w)
C.b.H(w.f,x)
w.aS()
x.x=d
w=A.bN(d)
C.b.m(w.f,x)
w.r=!0
A.bN(x.x).aS()},
sdL(d){y.n.a(d)
if(this.y===d)return
this.y=d
A.bN(this.x).aS()},
aq(d,e){var x,w,v,u,t=this
d.a=t
try{x=d.gT()
w=e==null?null:e.gT()
if(w==null&&C.b.S(t.w,x))return
if(w!=null&&!C.b.S(t.w,w))w=null
v=t.w
C.b.H(v,x)
u=w!=null?C.b.ac(v,w)+1:0
C.b.dW(v,u,x)
A.bN(t.x).aS()}finally{d.al()}},
H(d,e){C.b.H(this.w,e.gT())
e.a=null
A.bN(this.x).aS()}}
A.eJ.prototype={
gdR(){var x,w=this,v=w.b
if(v===$){x=B.G(B.p(b.G.document).querySelector(w.a.b))
x.toString
w.b!==$&&B.eD()
w.b=x
v=x}return v},
hA(d){var x,w,v,u,t,s,r,q,p,o,n,m=this
if(d||m.r){C.b.ah(m.f,new A.hU())
m.r=!1}x=m.c
if(x===$){w=A.pr(B.p(m.gdR().attributes))
m.c!==$&&B.eD()
m.c=w
x=w}for(v=m.f,u=v.length,t=0;t<v.length;v.length===u||(0,B.ai)(v),++t){s=v[t].y
if(s!=null)x.L(0,s)}r=B.ly(y.N)
for(q=0;v=m.gdR(),q<B.ar(B.p(v.attributes).length);++q)r.m(0,B.w(B.G(B.p(v.attributes).item(q)).name))
if(x.a!==0)for(u=new B.av(x,B.h(x).h("av<1,2>")).gv(0);u.n();){p=u.d
o=p.a
B.eL(v,o,p.b)
r.H(0,o)}if(r.a!==0)for(u=B.n0(r,r.r,r.$ti.c),o=u.$ti.c;u.n();){n=u.d
if(n==null)n=o.a(n)
v.removeAttribute(n)}},
aS(){return this.hA(!1)}}
A.hy.prototype={
P(d){var x=this,w=y.N,v=B.N(w,w)
v.L(0,x.y)
w=B.N(w,y.v)
w.L(0,F.m2().$1$1$onClick(x.f,y.H))
return new B.Z("button",null,x.w,x.x,v,w,x.Q,null)}}
A.hL.prototype={
P(d){var x,w=this,v=null,u=y.N
u=B.N(u,u)
u.L(0,w.x)
u.i(0,"viewBox",w.c)
x=w.d
x=x==null?v:B.j9(x.b)+x.a
if(x!=null)u.i(0,"width",x)
x=w.e
x=x==null?v:B.j9(x.b)+x.a
if(x!=null)u.i(0,"height",x)
return new B.Z("svg",v,v,v,u,v,w.z,v)}}
A.hz.prototype={
P(d){var x=this,w=null,v=y.N
v=B.N(v,v)
v.i(0,"cx",x.c)
v.i(0,"cy",x.d)
v.i(0,"r",x.e)
return new B.Z("circle",w,w,w,v,w,x.at,w)}}
A.hJ.prototype={
P(d){var x=null,w=y.N
w=B.N(w,w)
w.i(0,"d",this.c)
return new B.Z("path",x,x,x,w,x,this.Q,x)}}
A.ia.prototype={
b0(){return"Display."+this.b}}
A.ee.prototype={}
A.dd.prototype={
a9(){var x=B.bX(y.h),w=($.V+1)%16777215
$.V=w
return new A.hd(null,!1,!1,x,w,this,C.i)}}
A.hd.prototype={
aH(){var x=this.f
x.toString
return y.c.a(x).b},
ak(){var x=this.CW.d$
x.toString
return B.p2(x,null)},
aD(d){y.T.a(d)}}
A.f8.prototype={
P(d){var x=y.i
return new A.e3(this.c,B.f([A.bK(B.f([],x),"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z")],x),null)}}
A.fI.prototype={
P(d){var x=y.i
return new A.e3(this.c,B.f([new A.hz("12","12","4",B.f([],x),null),A.bK(B.f([],x),"M12 4h.01"),A.bK(B.f([],x),"M20 12h.01"),A.bK(B.f([],x),"M12 20h.01"),A.bK(B.f([],x),"M4 12h.01"),A.bK(B.f([],x),"M17.657 6.343h.01"),A.bK(B.f([],x),"M17.657 17.657h.01"),A.bK(B.f([],x),"M6.343 17.657h.01"),A.bK(B.f([],x),"M6.343 6.343h.01")],x),null)}}
A.e3.prototype={
P(d){var x=this.c,w=y.N
return new A.hL("0 0 24 24",new A.ee("px",x),new A.ee("px",x),B.b6(["fill","none","stroke","currentColor","stroke-width","2","stroke-linecap","round","stroke-linejoin","round"],w,w),this.d,null)}}
A.bn.prototype={
cp(){return new A.fL()}}
A.fL.prototype={
b6(){this.c3()
this.d=B.bu(B.G(B.p(b.G.document).documentElement).getAttribute("data-theme"))==="dark"},
P(d){var x,w=this,v=null,u=y.i,t=B.f([],u),s=w.d?"dark":"light",r=y.N
t.push(new A.cZ(B.b6(["data-theme",s],r,r),v))
r=B.b6(["aria-label","Theme Toggle"],r,r)
s=A.n7(w.d?D.y:v)
s=E.mc(B.f([new A.f8(20,v)],u),v,s)
x=A.n7(w.d?v:D.y)
t.push(new A.hy(new A.jn(w),"theme-toggle",v,r,B.f([s,E.mc(B.f([new A.fI(20,v)],u),v,x)],u),v))
return new A.dd(t,v)}}
var z=a.updateTypes(["c(b2,b2)"])
A.hU.prototype={
$2(d,e){var x=y.j
x.a(d)
x.a(e)
return d.z-e.z},
$S:z+0}
A.jn.prototype={
$0(){var x,w=this.a
w.aF(new A.jm(w))
x=B.p(B.p(b.G.window).localStorage)
w=w.d?"dark":"light"
x.setItem("jaspr:theme",w)},
$S:0}
A.jm.prototype={
$0(){var x=this.a
x.d=!x.d},
$S:0};(function inheritance(){var x=a.inheritMany,w=a.inherit
x(B.dZ,[A.eK,A.ia])
x(B.n,[A.cZ,A.dd])
x(B.bZ,[A.fY,A.hd])
w(A.b2,B.d8)
w(A.eJ,B.i)
w(A.hU,B.co)
x(E.P,[A.hy,A.hL,A.hz,A.hJ,A.f8,A.fI,A.e3])
w(A.ee,B.cf)
w(A.bn,E.az)
w(A.fL,E.al)
x(B.bT,[A.jn,A.jm])})()
B.eq(b.typeUniverse,JSON.parse('{"b2":{"aH":[],"lD":[],"c0":[]},"cZ":{"n":[]},"fY":{"ak":[],"k":[],"ab":[]},"hy":{"P":[],"n":[]},"hL":{"P":[],"n":[]},"hz":{"P":[],"n":[]},"hJ":{"P":[],"n":[]},"ee":{"ju":[]},"dd":{"n":[]},"hd":{"ak":[],"k":[],"ab":[]},"f8":{"P":[],"n":[]},"fI":{"P":[],"n":[]},"e3":{"P":[],"n":[]},"bn":{"az":[],"n":[]},"fL":{"al":["bn"],"al.T":"bn"}}'))
var y=(function rtii(){var x=B.D
return{U:x("cZ"),j:x("b2"),h:x("k"),c:x("dd"),z:x("q<b2>"),i:x("q<n>"),O:x("q<t>"),T:x("lC"),N:x("b"),n:x("u<b,b>?"),H:x("~"),v:x("~(t)")}})();(function constants(){var x=a.makeConstList
D.t=new A.eK(0,"html")
D.y=new A.ia(0,"none")
D.Y=x([],y.i)})();(function staticFields(){$.mo=B.N(B.D("eK"),B.D("eJ"))})()};
(a=>{a["rQcw8Tau/cL5lrVpOXVxYmUBBE4="]=a.current})($__dart_deferred_initializers__);
//# sourceMappingURL=main.client.dart.js_6.part.js.map
