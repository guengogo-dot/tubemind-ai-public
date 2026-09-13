const crypto=require('crypto');
module.exports=async function handler(req,res){
  const code=crypto.randomBytes(16).toString('hex');
  res.setHeader('Cache-Control','no-store');
  return res.status(200).json({
    url:'https://www.tubemindai.com/privacy.html',
    confirmation_code:code
  });
};
