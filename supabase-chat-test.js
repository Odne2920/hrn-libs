
(function(global){
  function HyperRushChat(config){
    if(!global.supabase) throw new Error("Supabase client ontbreekt");

    const sb = global.supabase.createClient(config.url, config.key);
    let user=null, profile=null, channel=null;

    async function init(){
      const { data:{ session } } = await sb.auth.getSession();
      user=session?.user||null;
      if(!user) return null;

      let { data } = await sb.from('users').select('*').eq('id',user.id).maybeSingle();
      if(!data){
        const r = await sb.from('users').insert([{id:user.id,email:user.email}]).select().single();
        data=r.data;
      }
      profile=data;
      return profile;
    }

    async function login(e,p){
      const r=await sb.auth.signInWithPassword({email:e,password:p});
      if(r.error) throw r.error;
      return init();
    }

    async function register(e,p){
      const r=await sb.auth.signUp({email:e,password:p});
      if(r.error) throw r.error;
    }

    async function setUsername(n){
      await sb.from('users').update({username:n}).eq('id',user.id);
      profile.username=n;
    }

    async function joinRoom(room,onMessage){
      channel = sb.channel(room)
        .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},p=>{
          onMessage&&onMessage(p.new);
        }).subscribe();
    }

    async function fetchMessages(){
      const { data } = await sb.from('messages')
        .select('*, users(username)')
        .order('created_at',{ascending:true});
      return data;
    }

    async function sendMessage(msg){
      if(!msg) return;
      await sb.from('messages').insert([{content:msg,user_id:user.id}]);
    }

    return {
      init, login, register, setUsername,
      joinRoom, fetchMessages, sendMessage,
      user:()=>({user,profile})
    };
  }

  global.HyperRushChat={ create: HyperRushChat };
})(window);
