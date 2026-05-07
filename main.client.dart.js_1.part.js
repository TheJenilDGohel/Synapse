((a,b)=>{a[b]=a[b]||{}})(self,"$__dart_deferred_initializers__")
$__dart_deferred_initializers__.current=function(a,b,c,$){var A,E,B={
pG(){return new B.bk(null)},
bk:function bk(d){this.a=d},
hn:function hn(d){var _=this
_.d=!1
_.e=""
_.f=d
_.c=null},
k2:function k2(d){this.a=d},
k4:function k4(d){this.a=d},
k5:function k5(d){this.a=d},
k6:function k6(d){this.a=d},
k7:function k7(){},
k8:function k8(d){this.a=d},
k3:function k3(d,e){this.a=d
this.b=e},
k9:function k9(d,e,f){this.a=d
this.b=e
this.c=f},
nA(d){var x=null
switch(d){case!0:x="true"
break
case!1:x="false"
break
case null:case void 0:break}return x},
eB:function eB(d,e,f,g,h,i){var _=this
_.c=d
_.Q=e
_.at=f
_.ax=g
_.a=h
_.$ti=i},
hx:function hx(d,e,f,g,h){var _=this
_.c=d
_.y=e
_.as=f
_.at=g
_.a=h},
hG:function hG(d,e,f){this.d=d
this.w=e
this.a=f},
pE(d){var x=B.pD(d)
x.toString
return x},
pD(d){d.ry.toString
d.fN(y.h)
return null}},D,C,F,G
A=c[0]
E=c[2]
B=a.updateHolder(c[3],B)
D=c[8]
C=c[6]
F=c[7]
G=c[9]
B.bk.prototype={
cp(){return new B.hn(A.f([new A.aB("Welcome to Synapse, the agentic layer.","/intro","Introduction"),new A.aB("Get Synapse up and running.","/install","Installation"),new A.aB("Start using Synapse in 2 minutes.","/quickstart","Quick Start"),new A.aB("Deep dive into persistent memory.","/pillars/temporal","Temporal Graph"),new A.aB("Advanced code retrieval.","/pillars/intel","Code Intelligence"),new A.aB("Autonomous task execution.","/pillars/gsd","GSD Workflow"),new A.aB("Explore the 70+ MCP tools.","/tools","Tools Overview"),new A.aB("Learn how to contribute.","/contributing","Contributing"),new A.aB("Connect with other developers.","/community","Community")],y.q))}}
B.hn.prototype={
dE(){this.aF(new B.k2(this))},
b6(){this.c3()},
P(d){var x,w,v,u,t,s,r,q,p=this,o=null,n=p.f,m=A.K(n),l=m.h("br<1>"),k=A.aw(new A.br(n,m.h("L(1)").a(new B.k4(p)),l),l.h("e.E"))
n=y.w
m=y.a
l=A.b6(["click",new B.k5(p)],n,m)
x=y.F
l=A.f([C.bf(A.f([new B.hG("search-icon",A.f([],x),o),D.mc(A.f([new A.af("Search documentation...",o)],x),o,o),new A.Z("kbd",o,o,o,o,o,A.f([new A.af("\u2318K",o)],x),o)],x),"search-trigger",l)],x)
if(p.d){w=A.b6(["click",new B.k6(p)],n,m)
v=A.b6(["click",new B.k7()],n,m)
u=C.bf(A.f([new B.eB(G.S,"search-input",A.b6(["placeholder","Type to search...","autofocus",""],n,n),A.b6(["input",new B.k8(p)],n,m),o,y.s)],x),"search-input-container",o)
t=A.f([],x)
s=k.length
if(s===0)t.push(C.bf(A.f([new A.af('No results found for "'+p.e+'"',o)],x),"no-results",o))
else for(r=0;r<k.length;k.length===s||(0,A.ai)(k),++r){q=k[r]
t.push(new B.hx(q.b,"search-item",A.b6(["click",new B.k9(p,d,q)],n,m),A.f([new C.aP(o,o,A.f([new C.aP("item-title",o,A.f([new A.af(q.c,o)],x),o),new C.aP("item-desc",o,A.f([new A.af(q.a,o)],x),o)],x),o)],x),o))}l.push(C.bf(A.f([C.bf(A.f([u,C.bf(t,"search-results",o)],x),"search-modal",v)],x),"search-modal-overlay",w))}return C.bf(l,o,o)}}
B.eB.prototype={
P(d){var x,w=this,v=null,u=y.w,t=A.N(u,u)
t.L(0,w.at)
t.i(0,"type",w.c.c)
x=B.nA(v)
if(x!=null)t.i(0,"checked",x)
x=B.nA(v)
if(x!=null)t.i(0,"indeterminate",x)
u=A.N(u,y.a)
u.L(0,w.ax)
u.L(0,F.m2().$1$2$onChange$onInput(v,v,w.$ti.c))
return new A.Z("input",v,w.Q,v,t,u,v,v)}}
B.hx.prototype={
P(d){var x=this,w=null,v=y.w,u=A.N(v,v)
u.i(0,"href",x.c)
v=A.N(v,y.a)
v.L(0,x.as)
v.L(0,F.m2().$1$1$onClick(w,y.v))
return new A.Z("a",w,x.y,w,u,v,x.at,w)}}
B.hG.prototype={
P(d){var x=null
return new A.Z("i",x,this.d,x,x,x,this.w,x)}}
var z=a.updateTypes([])
B.k2.prototype={
$0(){var x=this.a,w=x.d
x.d=!w
if(w)x.e=""},
$S:0}
B.k4.prototype={
$1(d){var x
y.t.a(d)
x=this.a.e
return E.a.S(d.c.toLowerCase(),x.toLowerCase())||E.a.S(d.a.toLowerCase(),x.toLowerCase())},
$S:52}
B.k5.prototype={
$1(d){A.p(d)
return this.a.dE()},
$S:3}
B.k6.prototype={
$1(d){A.p(d)
return this.a.dE()},
$S:3}
B.k7.prototype={
$1(d){A.p(d).hF()},
$S:3}
B.k8.prototype={
$1(d){var x=this.a
x.aF(new B.k3(x,A.p(d)))},
$S:3}
B.k3.prototype={
$0(){return this.a.e=A.G(this.b.target).ghM()},
$S:0}
B.k9.prototype={
$1(d){A.p(d).hK()
B.pE(this.b).hL(this.c.b)},
$S:3};(function inheritance(){var x=a.inherit,w=a.inheritMany
x(B.bk,D.az)
x(B.hn,D.al)
w(A.bT,[B.k2,B.k3])
w(A.a6,[B.k4,B.k5,B.k6,B.k7,B.k8,B.k9])
w(D.P,[B.eB,B.hx,B.hG])})()
A.eq(b.typeUniverse,JSON.parse('{"bk":{"az":[],"n":[]},"hn":{"al":["bk"],"al.T":"bk"},"eB":{"P":[],"n":[]},"hx":{"P":[],"n":[]},"hG":{"P":[],"n":[]},"pe":{"ls":[],"n":[]}}'))
var y={h:A.D("pe"),F:A.D("q<n>"),q:A.D("q<+description,path,title(b,b,b)>"),t:A.D("+description,path,title(b,b,b)"),w:A.D("b"),s:A.D("eB<@>"),v:A.D("~"),a:A.D("~(t)")}};
(a=>{a["sUWkotMWRs+pT03DcAvAMsoPF70="]=a.current})($__dart_deferred_initializers__);
//# sourceMappingURL=main.client.dart.js_1.part.js.map
