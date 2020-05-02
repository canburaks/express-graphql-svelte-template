<script>
import { beforeUpdate } from "svelte";
import { fetcher } from "../../lib/lib.js"
let name="";
let email="";
let tel;
$: data = { name, email, tel}

//beforeUpdate(()=>{
//    console.log("data", data)
//});
const query = `
    mutation contactForm($name:String!, $email:String, $tel:String){
        contactForm(name:$name, email:$email, tel:$tel)
    }
`;
function callback(data){
    console.log("data", data);
};

function handleSubmit(){
    fetcher(query, callback, data)
};

</script>

<form on:submit|preventDefault={handleSubmit}>
    <div>
        <label>İsminiz</label>
        <input type="text" bind:value={name} />
    </div>
    <div>
        <label>Email</label>
        <input type="email" bind:value={email} />
    </div>
    <div>
        <label>Telefon</label>
        <input type="tel" bind:value={tel} />
    </div>
    <button type="submit">GÖNDER</button>
</form>

<style lang="scss">
    form {
        padding:32px 16px;
        width:80%;
        max-width:300px;
        height:auto;
        background-color: white;
        input {
            width:100%;
            background: grey;
        }
        div {
            display: block;
            position:relative;
        }
    } 
</style>