((a,b)=>{a[b]=a[b]||{}})(self,"$__dart_deferred_initializers__")
$__dart_deferred_initializers__.current=function(a,b,c,$){var A,E,B={
pI(){return new B.bk(null)},
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
k7:function k7(d){this.a=d},
k8:function k8(){},
k9:function k9(d){this.a=d},
k3:function k3(d,e){this.a=d
this.b=e},
ka:function ka(d,e,f){this.a=d
this.b=e
this.c=f},
nB(d){var x=null
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
pG(d){var x=B.pF(d)
x.toString
return x},
pF(d){d.ry.toString
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
cp(){return new B.hn(A.f([new A.aq("Welcome to Synapse: the local-first context layer for AI agents.","/intro","Introduction"),new A.aq("Step-by-step guide to installing Synapse and its dependencies.","/install","Installation"),new A.aq("Connect your AI client and run your first semantic query in minutes.","/quickstart","Quick Start"),new A.aq("Long-term semantic recall and cross-session AI memory.","/pillars/memory","Persistent Memory"),new A.aq("Track architectural facts and decisions over time with triple storage.","/pillars/temporal","Temporal Knowledge Graph"),new A.aq("AST-aware semantic code search and hybrid retrieval.","/pillars/intel","Code Intelligence"),new A.aq("Deep dive into the Synapse local runtime and storage layout.","/pillars/architecture","Architecture"),new A.aq("Reference guide for the 74 specialized MCP tools available in Synapse.","/tools","Tools Overview"),new A.aq("Join the community and help build the future of AI context.","/contributing","Contributing"),new A.aq("Connect with other developers and share Synapse patterns.","/community","Community")],y.q))}}
B.hn.prototype={
dE(){this.aG(new B.k2(this))},
b6(){this.c3()},
P(d){var x,w,v,u,t,s,r,q,p=this,o=null,n=p.f,m=A.K(n),l=m.h("br<1>"),k=A.ax(new A.br(n,m.h("L(1)").a(new B.k4(p)),l),l.h("e.E"))
n=y.w
m=A.aU(["role","button","tabindex","0","aria-label","Open search"],n,n)
l=y.a
x=A.aU(["click",new B.k5(p),"keydown",new B.k6(p)],n,l)
w=y.F
x=A.f([C.bf(A.f([new B.hG("search-icon",A.f([],w),o),D.md(A.f([new A.af("Search documentation...",o)],w),o,o),new A.Z("kbd",o,o,o,o,o,A.f([new A.af("\u2318K",o)],w),o)],w),m,"search-trigger",x)],w)
if(p.d){m=A.aU(["click",new B.k7(p)],n,l)
v=A.aU(["click",new B.k8()],n,l)
u=C.bf(A.f([new B.eB(G.S,"search-input",A.aU(["placeholder","Type to search...","autofocus",""],n,n),A.aU(["input",new B.k9(p)],n,l),o,y.s)],w),o,"search-input-container",o)
t=A.f([],w)
s=k.length
if(s===0)t.push(C.bf(A.f([new A.af('No results found for "'+p.e+'"',o)],w),o,"no-results",o))
else for(r=0;r<k.length;k.length===s||(0,A.ai)(k),++r){q=k[r]
t.push(new B.hx(C.oa(q.b),"search-item",A.aU(["click",new B.ka(p,d,q)],n,l),A.f([new C.aP(o,o,o,A.f([new C.aP("item-title",o,o,A.f([new A.af(q.c,o)],w),o),new C.aP("item-desc",o,o,A.f([new A.af(q.a,o)],w),o)],w),o)],w),o))}x.push(C.bf(A.f([C.bf(A.f([u,C.bf(t,o,"search-results",o)],w),o,"search-modal",v)],w),o,"search-modal-overlay",m))}return C.bf(x,o,o,o)}}
B.eB.prototype={
P(d){var x,w=this,v=null,u=y.w,t=A.N(u,u)
t.L(0,w.at)
t.i(0,"type",w.c.c)
x=B.nB(v)
if(x!=null)t.i(0,"checked",x)
x=B.nB(v)
if(x!=null)t.i(0,"indeterminate",x)
u=A.N(u,y.a)
u.L(0,w.ax)
u.L(0,F.m3().$1$2$onChange$onInput(v,v,w.$ti.c))
return new A.Z("input",v,w.Q,v,t,u,v,v)}}
B.hx.prototype={
P(d){var x=this,w=null,v=y.w,u=A.N(v,v)
u.i(0,"href",x.c)
v=A.N(v,y.a)
v.L(0,x.as)
v.L(0,F.m3().$1$1$onClick(w,y.v))
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
$S:1}
B.k6.prototype={
$1(d){A.p(d)
d.gh2()
d.gh2()},
$S:1}
B.k7.prototype={
$1(d){A.p(d)
return this.a.dE()},
$S:1}
B.k8.prototype={
$1(d){A.p(d).hG()},
$S:1}
B.k9.prototype={
$1(d){var x=this.a
x.aG(new B.k3(x,A.p(d)))},
$S:1}
B.k3.prototype={
$0(){return this.a.e=A.G(this.b.target).ghN()},
$S:0}
B.ka.prototype={
$1(d){A.p(d).hL()
B.pG(this.b).hM(this.c.b)},
$S:1};(function inheritance(){var x=a.inherit,w=a.inheritMany
x(B.bk,D.aA)
x(B.hn,D.al)
w(A.bT,[B.k2,B.k3])
w(A.a6,[B.k4,B.k5,B.k6,B.k7,B.k8,B.k9,B.ka])
w(D.P,[B.eB,B.hx,B.hG])})()
A.eq(b.typeUniverse,JSON.parse('{"bk":{"aA":[],"n":[]},"hn":{"al":["bk"],"al.T":"bk"},"eB":{"P":[],"n":[]},"hx":{"P":[],"n":[]},"hG":{"P":[],"n":[]},"pg":{"lt":[],"n":[]}}'))
var y={h:A.D("pg"),F:A.D("q<n>"),q:A.D("q<+description,path,title(b,b,b)>"),t:A.D("+description,path,title(b,b,b)"),w:A.D("b"),s:A.D("eB<@>"),v:A.D("~"),a:A.D("~(t)")}};
(a=>{a["yQXpjxHDqM4bE18SzJ+d0p2EIxM="]=a.current})($__dart_deferred_initializers__);
//# sourceMappingURL=main.client.dart.js_1.part.js.map
