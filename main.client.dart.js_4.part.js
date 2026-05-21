((a,b)=>{a[b]=a[b]||{}})(self,"$__dart_deferred_initializers__")
$__dart_deferred_initializers__.current=function(a,b,c,$){var A,E,F,G,D,B={
nA(d){var x=null
switch(d){case!0:x="true"
break
case!1:x="false"
break
case null:case void 0:break}return x},
eC:function eC(d,e,f,g,h,i){var _=this
_.c=d
_.Q=e
_.at=f
_.ax=g
_.a=h
_.$ti=i},
hy:function hy(d,e,f,g,h){var _=this
_.c=d
_.y=e
_.as=f
_.at=g
_.a=h},
pJ(){return new B.bk(null)},
bk:function bk(d){this.a=d},
ho:function ho(d){var _=this
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
pH(d){var x=B.pG(d)
x.toString
return x},
pG(d){d.ry.toString
d.fN(y.h)
return null}},C
A=c[0]
E=c[2]
F=c[6]
G=c[10]
D=c[8]
B=a.updateHolder(c[4],B)
C=c[7]
B.eC.prototype={
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
return new A.a1("input",v,w.Q,v,t,u,v,v)}}
B.hy.prototype={
P(d){var x=this,w=null,v=y.w,u=A.N(v,v)
u.i(0,"href",x.c)
v=A.N(v,y.a)
v.L(0,x.as)
v.L(0,F.m2().$1$1$onClick(w,y.v))
return new A.a1("a",w,x.y,w,u,v,x.at,w)}}
B.bk.prototype={
co(){return new B.ho(A.f([new A.Y("Synapse Core: The local-first context layer.","/intro","Introduction"),new A.Y("Get running in 5 minutes.","/tutorials/quickstart","Quick Start"),new A.Y("System requirements and setup.","/how-to/install","Installation"),new A.Y("Environment and JSON tuning.","/how-to/configuration","Configuration"),new A.Y("How to query, prune, and persist memory.","/how-to/memory","Managing Memory"),new A.Y("Using entity-relationship and temporal graph tools.","/how-to/kg","Knowledge Graph Guide"),new A.Y("How the neural context engine works.","/explanation/concepts","Core Concepts"),new A.Y("Internal layers and data flow.","/explanation/architecture","Architecture"),new A.Y("AST-aware semantic search.","/explanation/code-intelligence","Code Intelligence"),new A.Y("Long-term cross-session recall.","/explanation/memory","Persistent Memory"),new A.Y("Temporal relationship tracking.","/explanation/knowledge-graph","Knowledge Graph"),new A.Y("Full MCP tool-call documentation.","/reference/tools","Power Controllers"),new A.Y("Commands and syntax.","/reference/cli","CLI Reference"),new A.Y("Configuration options guide.","/reference/config","Config Options"),new A.Y("Connect with developers using and improving Synapse.","/community","Community Hub"),new A.Y("Guidelines for contributing to Synapse.","/contributing","Contributing"),new A.Y("Frequently asked questions, performance tips, and architectural tradeoffs.","/faq","FAQ")],y.q))}}
B.ho.prototype={
dE(){this.aG(new B.k2(this))},
P(d){var x,w,v,u,t,s,r,q,p=this,o=null,n=p.f,m=A.K(n),l=m.h("bq<1>"),k=A.ax(new A.bq(n,m.h("L(1)").a(new B.k4(p)),l),l.h("e.E"))
n=y.w
m=y.a
l=A.b6(["click",new B.k5(p)],n,m)
x=y.F
l=A.f([C.bf(A.f([D.mc(A.f([new A.ag("Search documentation...",o)],x),o,o),new A.a1("kbd",o,o,o,o,o,A.f([new A.ag("\u2318K",o)],x),o)],x),"search-trigger",l)],x)
if(p.d){w=A.b6(["click",new B.k6(p)],n,m)
v=A.b6(["click",new B.k7()],n,m)
u=C.bf(A.f([new B.eC(G.S,"search-input",A.b6(["placeholder","Search Synapse...","autofocus",""],n,n),A.b6(["input",new B.k8(p)],n,m),o,y.s)],x),"search-input-container",o)
t=A.f([],x)
s=k.length
if(s===0)t.push(C.bf(A.f([new A.ag('No results for "'+p.e+'"',o)],x),"no-results",o))
else for(r=0;r<k.length;k.length===s||(0,A.aj)(k),++r){q=k[r]
t.push(new B.hy(C.oa(q.b),"search-item",A.b6(["click",new B.k9(p,d,q)],n,m),A.f([new C.aZ("item-title",o,A.f([new A.ag(q.c,o)],x),o),new C.aZ("item-desc",o,A.f([new A.ag(q.a,o)],x),o)],x),o))}l.push(C.bf(A.f([C.bf(A.f([u,C.bf(t,"search-results",o)],x),"search-modal",v)],x),"search-modal-overlay",w))}return C.bf(l,o,o)}}
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
$1(d){return A.p(d).hF()},
$S:3}
B.k8.prototype={
$1(d){var x=this.a
return x.aG(new B.k3(x,A.p(d)))},
$S:3}
B.k3.prototype={
$0(){return this.a.e=A.G(this.b.target).ghM()},
$S:0}
B.k9.prototype={
$1(d){A.p(d).hK()
B.pH(this.b).hL(this.c.b)},
$S:3};(function inheritance(){var x=a.inheritMany,w=a.inherit
x(D.P,[B.eC,B.hy])
w(B.bk,D.aK)
w(B.ho,D.am)
x(A.bS,[B.k2,B.k3])
x(A.a7,[B.k4,B.k5,B.k6,B.k7,B.k8,B.k9])})()
A.er(b.typeUniverse,JSON.parse('{"eC":{"P":[],"n":[]},"hy":{"P":[],"n":[]},"bk":{"aK":[],"n":[]},"ho":{"am":["bk"],"am.T":"bk"},"ph":{"ls":[],"n":[]}}'))
var y={h:A.D("ph"),F:A.D("q<n>"),q:A.D("q<+description,path,title(b,b,b)>"),t:A.D("+description,path,title(b,b,b)"),w:A.D("b"),s:A.D("eC<@>"),v:A.D("~"),a:A.D("~(t)")}};
(a=>{a["AgnLyNdzJkz+QyfMDIDYK68LDVs="]=a.current})($__dart_deferred_initializers__);
//# sourceMappingURL=main.client.dart.js_4.part.js.map
