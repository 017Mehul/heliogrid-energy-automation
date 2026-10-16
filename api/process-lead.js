const services = ["AI Videos","Websites","Apps","UI/UX"];
const budgets = ["Under ₹10k","₹10k–₹25k","₹25k–₹50k","₹50k+"];
const timelines = ["Just exploring","Within 1 month","Within 2 weeks","ASAP"];
const demo = process.env.DEMO_MODE !== "false";
// Never permit external side effects while the endpoint is in sandbox mode.
const integrationsEnabled = integrationsAllowed(process.env);
let poolPromise;

export function integrationsAllowed(env = process.env) {
  return env.DEMO_MODE === "false" && env.ENABLE_REAL_INTEGRATIONS === "true";
}

function reply(res,status,data){
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store");
  if(process.env.APP_ORIGIN){
    res.setHeader("Access-Control-Allow-Origin",process.env.APP_ORIGIN);
    res.setHeader("Vary","Origin");
  }
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type, Idempotency-Key");
  return res.status(status).json(data);
}
const s=v=>typeof v==="string"?v.trim():"";
function score(l){
  const b={"Under ₹10k":12,"₹10k–₹25k":22,"₹25k–₹50k":30,"₹50k+":36}[l.budget];
  const t={"Just exploring":8,"Within 1 month":18,"Within 2 weeks":25,"ASAP":30}[l.timeline];
  const sv={"AI Videos":18,"Websites":16,"Apps":16,"UI/UX":14}[l.service];
  const m=l.message.length>=60?12:l.message.length>=25?7:3;
  const n=Math.min(99,b+t+sv+m);
  return {score:n,tier:n>=72?"Hot":n>=52?"Warm":"Nurture",method:"rules_v1"};
}
async function request(url,opts={},timeout=7000){
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout);
  try{return await fetch(url,{...opts,signal:c.signal,redirect:"error"})}
  finally{clearTimeout(timer)}
}
async function getPool(){
  if(!process.env.DATABASE_URL)throw Error("DATABASE_URL is not configured");
  if(!poolPromise){
    poolPromise=import("pg").then(({Pool})=>new Pool({
      connectionString:process.env.DATABASE_URL,
      ssl:process.env.PGSSLMODE==="disable"?false:{rejectUnauthorized:false},
      max:3,
      idleTimeoutMillis:10000,
      connectionTimeoutMillis:5000
    }));
  }
  return poolPromise;
}
async function persist(r){
  const pool=await getPool(),l=r.lead;
  await pool.query(
    `insert into automation_leads
      (workflow_id,source,mode,name,email,phone,service,budget,timeline,message,score,tier,routing,integrations,workflow_status,created_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15,$16)`,
    [r.workflowId,r.source,r.mode,l.name,l.email,l.phone||null,l.service,l.budget,l.timeline,l.message||null,
     r.qualification.score,r.qualification.tier,JSON.stringify(r.routing),JSON.stringify(r.integrations),r.automation.status,r.createdAt]
  );
}
async function run(name,fn){
  try{return {provider:name,status:(await fn()).status}}
  catch(e){console.error("Integration "+name,e);return {provider:name,status:"failed",error:"Integration failed; check server logs"}}
}
async function external(name,record){
  const l=record.lead;
  let url,headers={"Content-Type":"application/json"},body;
  if(name==="Webhook"){
    if(!process.env.AUTOMATION_WEBHOOK_URL)return {status:"not_configured"};
    url=new URL(process.env.AUTOMATION_WEBHOOK_URL);
    if(url.protocol!=="https:")throw Error("Webhook must use HTTPS");
    body=JSON.stringify(record);
  }
  if(name==="Slack"){
    if(!process.env.SLACK_WEBHOOK_URL)return {status:"not_configured"};
    url=process.env.SLACK_WEBHOOK_URL;
    body=JSON.stringify({text:"DEMO lead: "+l.name+" · "+l.email+" · "+record.qualification.tier+" · "+l.service});
  }
  if(name==="Email"){
    if(!process.env.RESEND_API_KEY||!process.env.LEAD_NOTIFY_EMAIL||!process.env.LEAD_FROM_EMAIL)return {status:"not_configured"};
    url="https://api.resend.com/emails";
    headers.Authorization="Bearer "+process.env.RESEND_API_KEY;
    body=JSON.stringify({from:process.env.LEAD_FROM_EMAIL,to:[process.env.LEAD_NOTIFY_EMAIL],subject:"[DEMO] "+record.qualification.tier+" lead "+record.workflowId,text:"Public demo submission\n"+JSON.stringify(l,null,2)+"\nScore: "+record.qualification.score+"\nWorkflow: "+record.workflowId});
  }
  if(name==="HubSpot"){
    const token=process.env.HUBSPOT_ACCESS_TOKEN;
    if(!token)return {status:"not_configured"};
    headers.Authorization="Bearer "+token;
    const parts=l.name.split(/\s+/);
    const search=await request("https://api.hubapi.com/crm/v3/objects/contacts/search",{method:"POST",headers,body:JSON.stringify({filterGroups:[{filters:[{propertyName:"email",operator:"EQ",value:l.email}]}],properties:["email"]})});
    if(!search.ok)throw Error("HubSpot search HTTP "+search.status);
    const found=(await search.json()).results?.[0];
    url=found?"https://api.hubapi.com/crm/v3/objects/contacts/"+encodeURIComponent(found.id):"https://api.hubapi.com/crm/v3/objects/contacts";
    body=JSON.stringify({properties:{email:l.email,firstname:parts.shift(),lastname:parts.join(" "),...(l.phone?{phone:l.phone}:{})}});
    const wr=await request(url,{method:found?"PATCH":"POST",headers,body});
    if(!wr.ok)throw Error("HubSpot write HTTP "+wr.status);
    return {status:found?"updated":"created"};
  }
  const resp=await request(url,{method:"POST",headers,body});
  if(!resp.ok)throw Error(name+" HTTP "+resp.status);
  return {status:"sent"};
}

export default async function handler(req,res){
  if(req.method==="OPTIONS")return reply(res,204,{});
  if(req.method!=="POST")return reply(res,405,{ok:false,error:"Method not allowed"});
  const origin=s(req.headers?.origin);
  if(origin&&process.env.APP_ORIGIN&&origin!==process.env.APP_ORIGIN){
    const host=s(req.headers?.["x-forwarded-host"]||req.headers?.host).split(",")[0];
    const protocol=s(req.headers?.["x-forwarded-proto"]).split(",")[0]||"https";
    if(!host||origin!==`${protocol}://${host}`)return reply(res,403,{ok:false,error:"Origin not allowed"});
  }
  const b=req.body&&typeof req.body==="object"&&!Array.isArray(req.body)?req.body:{};
  if(s(b.website))return reply(res,400,{ok:false,error:"Invalid submission."});
  const l={name:s(b.name),email:s(b.email).toLowerCase(),phone:s(b.phone),message:s(b.message),service:b.service,budget:b.budget,timeline:b.timeline};
  if(!l.name||l.name.length>100)return reply(res,400,{ok:false,error:"Name is required (maximum 100 characters)."});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.email)||l.email.length>254)return reply(res,400,{ok:false,error:"Enter a valid email address."});
  if(l.phone.length>40||l.message.length>2000)return reply(res,400,{ok:false,error:"Phone or message exceeds the allowed length."});
  if(!services.includes(l.service)||!budgets.includes(l.budget)||!timelines.includes(l.timeline))return reply(res,400,{ok:false,error:"Choose a valid service, budget and timeline."});
  if(!process.env.DATABASE_URL)return reply(res,503,{ok:false,error:"Demo storage is not configured yet."});

  const record={workflowId:crypto.randomUUID(),createdAt:new Date().toISOString(),source:"heliogrid_public_demo",mode:demo?"sandbox":"live",lead:l,qualification:score(l),routing:{representative:"MG Labs Co. — New Business",queue:"portfolio-leads"}};
  const entries=[["hubspot","HubSpot"],["slack","Slack"],["email","Email"],["webhook","Webhook"]];
  let integrations=Object.fromEntries(entries.map(([k,n])=>[k,{provider:n,status:"disabled_in_sandbox"}]));
  if(integrationsEnabled){
    const results=await Promise.all(entries.map(([k,n])=>run(n,()=>external(n,record))));
    integrations=Object.fromEntries(results.map((x,i)=>[entries[i][0],x]));
  }
  const vals=Object.values(integrations),success=vals.filter(x=>["sent","created","updated"].includes(x.status)).length,failed=vals.some(x=>x.status==="failed");
  record.integrations=integrations;
  record.automation={status:failed?(success?"partial":"failed"):(demo?"sandbox_completed":"completed"),configuredIntegrations:vals.filter(x=>!["disabled_in_sandbox","not_configured"].includes(x.status)).length,successfulIntegrations:success};
  try{await persist(record)}
  catch(e){console.error("Lead persistence failed",e);return reply(res,503,{ok:false,error:"Could not save this lead. No success was reported; please retry."})}
  return reply(res,200,{ok:true,mode:record.mode,workflowId:record.workflowId,createdAt:record.createdAt,lead:l,qualification:record.qualification,routing:record.routing,integrations,automation:record.automation,followUp:{bookingReady:Boolean(process.env.BOOKING_URL),bookingUrl:process.env.BOOKING_URL||null}});
}
