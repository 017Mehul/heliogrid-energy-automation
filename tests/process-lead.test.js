import test from "node:test";
import assert from "node:assert/strict";
import handler, { integrationsAllowed } from "../api/process-lead.js";
function response(){return {statusCode:200,headers:{},payload:null,setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(v){this.payload=v;return this}}}
const lead={name:"Demo User",email:"demo@example.com",phone:"",service:"Websites",budget:"₹10k–₹25k",timeline:"Within 1 month",message:"A demo project with enough detail to qualify."};
test("rejects GET",async()=>{const r=response();await handler({method:"GET",headers:{}},r);assert.equal(r.statusCode,405)});
test("supports CORS preflight",async()=>{const r=response();await handler({method:"OPTIONS",headers:{}},r);assert.equal(r.statusCode,204)});
test("rejects invalid email",async()=>{const r=response();await handler({method:"POST",headers:{},body:{...lead,email:"bad"}},r);assert.equal(r.statusCode,400)});
test("rejects oversized message",async()=>{const r=response();await handler({method:"POST",headers:{},body:{...lead,message:"x".repeat(2001)}},r);assert.equal(r.statusCode,400)});
test("rejects invalid service",async()=>{const r=response();await handler({method:"POST",headers:{},body:{...lead,service:"Unknown"}},r);assert.equal(r.statusCode,400)});

test("sandbox mode always disables external integrations",()=>{
  assert.equal(integrationsAllowed({DEMO_MODE:"true",ENABLE_REAL_INTEGRATIONS:"true"}),false);
  assert.equal(integrationsAllowed({DEMO_MODE:undefined,ENABLE_REAL_INTEGRATIONS:"true"}),false);
});
test("live integrations require both explicit switches",()=>{
  assert.equal(integrationsAllowed({DEMO_MODE:"false",ENABLE_REAL_INTEGRATIONS:"true"}),true);
  assert.equal(integrationsAllowed({DEMO_MODE:"false",ENABLE_REAL_INTEGRATIONS:"false"}),false);
});
