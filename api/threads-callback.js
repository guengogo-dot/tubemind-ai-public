module.exports=async function handler(req,res){
  const incoming=new URL(req.url,'https://www.tubemindai.com');
  const target=new URL('https://test.as6one.com/api/threads');
  incoming.searchParams.forEach((value,key)=>target.searchParams.set(key,value));
  res.setHeader('Cache-Control','no-store');
  if(!incoming.searchParams.toString()){
    return res.status(200).json({ok:true,service:'threads-oauth-callback'});
  }
  res.statusCode=302;
  res.setHeader('Location',target.toString());
  return res.end();
};
