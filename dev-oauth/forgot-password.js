const AUTH="https://ep-red-boat-b2at0ihs.neonauth.c-6.eu-central-1.aws.neon.tech/neondb/auth";
const form=document.getElementById("recover"), status=document.getElementById("status"), button=document.getElementById("submit");
const initial=new URLSearchParams(location.search).get("email");if(initial)form.elements.email.value=initial;
history.replaceState(null,"",location.pathname);
form.addEventListener("submit",async event=>{event.preventDefault();if(!form.reportValidity())return;
button.disabled=true;status.textContent="Sending recovery email...";
try{const response=await fetch(AUTH+"/request-password-reset",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:form.elements.email.value.trim(),redirectTo:"https://dev-auth.tubemindai.com/dev-oauth/reset-password.html"}),credentials:"omit"});if(!response.ok){const body=await response.json().catch(()=>({}));throw Error(body.message||"Could not send recovery email. Please try again.");}form.hidden=true;status.textContent="If an account exists for this email, a password reset link will arrive shortly. Check your inbox and spam folder.";}catch(error){status.textContent=error instanceof Error?error.message:"Unable to send recovery email.";}finally{button.disabled=false;}});
