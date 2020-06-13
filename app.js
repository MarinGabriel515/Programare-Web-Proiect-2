const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session=require('express-session');
const bodyParser = require('body-parser')
var cookieParser = require('cookie-parser')
const app = express();
app.use(cookieParser())
const port = 6789;
const fs = require('fs');
var LI=[];
var sessionstorage = require('sessionstorage');
var mongo = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://127.0.0.1:27017/mydb";
var cos=[];


fs.readFile('intrebari.json','utf8', function (err, data) {
	if (err) throw err;
	LI = JSON.parse(data);
  });

app.set('view engine', 'ejs');
app.use(expressLayouts);
app.use(express.static('public'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
	secret: 'secret',
	resave: false,
	saveUninitialized: false,
	cookie: {
	maxAge: 10000
	}
	}));


	app.get('/creare-bd', (req, res) => {
		MongoClient.connect(url, function(err, db) {
			if (err) throw err;
			console.log("Database created!");
			var dbo = db.db("mydb");
			dbo.createCollection("produse", function(err, res) {
				if (err) throw err;
				console.log("Collection created!");
				db.close();
  		  });
		  });
		  res.redirect("/");
	});
	
	app.get('/inserare-bd', (req, res) => {
		MongoClient.connect(url,function(err,db)
		{
			if (err) throw err;
			dbo = db.db("mydb");
			var produseJSON=
			[
			{id:1,numeProdus:"Frigider",pret:"7000 Lei"},
			{id:2,numeProdus:"Toaster",pret:"300 Lei"},
			{id:3,numeProdus:"Televizor",pret:"2000 Lei"},
			{id:4,numeProdus:"Router",pret:"500 Lei"},
			{id:5,numeProdus:"Aspirator",pret:"1500 Lei"},
			{id:6,numeProdus:"Termostat",pret:"4000 Lei"},
			{id:7,numeProdus:"Blender",pret:"400 Lei"},
			{id:8,numeProdus:"Plita",pret:"4800 Lei"}];

			dbo.collection("produse").insertMany(produseJSON);
		})
		res.redirect("/")
	});

app.get('/', (req, res) => {
	var vectorObiecteProdus=null;
	var myArr=[];
	var index=0;
	MongoClient.connect(url,function(err,db)
		{
			if (err) throw err;
			dbo = db.db("mydb");
			dbo.listCollections().toArray(function(err, items){
				if (err) throw err;
				if(items.length==0)
				{
				console.log("Nu am gasit nici o colectie")
				res.render('index',{Utilizator : req.cookies.Utilizator,Produse:vectorObiecteProdus});
				//sessionstorage.setItem("test","test");
				}
				else
				{
				var cursor=dbo.collection('produse').find().toArray(function(err,rez)
				{
					if(err) throw err;
					res.render('index',{Utilizator : req.cookies.Utilizator,Produse:rez});
				//sessionstorage.setItem("test","test");
				});
				}
			  }); 
		});
});

app.get('/logout', (req, res) => {
	req.session.destroy(function(err){
		if(err){
			console.log(err);
			return;
		} else {
			res.clearCookie('Utilizator')
			res.redirect(302,'/autentificare');
			return;
		}
	})
});

app.get('/admin', (req, res) => {
	res.render('admin');
});

app.get('/autentificare', (req, res) => {
	res.render('autentificare',{Eroare : req.cookies.mesajEroare});
});

app.get('/chestionar', (req, res) => {
	res.render('chestionar', {intrebari: LI.Intrebari});
});

app.get('/vizualizeaza-cos', (req, res) => {
	var cos=sessionstorage.getItem("vectorID");
	cos=JSON.parse(cos);

	var cursor=dbo.collection('produse').find().toArray(function(err,rez)
	{
		var aux=[];
		rez.forEach(elementRez=>
			{
				cos.forEach(elementCos=>
					{
						if(elementRez.id==elementCos.IdProdus)
						{
							aux.push(elementRez);
							return;
						}
					});
			});
			res.render('vizualizare-cos',{cosCumparaturi:aux});
	});	
});

app.post('/rezultat-chestionar', (req, res) => {
	res.render("rezultat-chestionar",{data:JSON.stringify(req.body)});
});

app.post('/verificare-autentificare',(req,res)=>
{
console.log(req.body);
var objAutentificare=ExistaUtilizator(req.body.Nume,req.body.Parola);
console.log(objAutentificare);
if(objAutentificare.ExistaUser)
{

	if(objAutentificare.Admin)
	{
		res.cookie("Utilizator",req.body.Nume,{ expires: new Date(Date.now() + 10000)});
		res.redirect("/admin");
		res.end();
	}
	else
	{
		res.cookie("Utilizator",req.body.Nume,{ expires: new Date(Date.now() + 10000)});
		res.redirect("http://localhost:6789/")
		res.end();
	}
}
else
{
	res.cookie("mesajEroare","Credentiale incorecte",{ expires: new Date(Date.now() + 1000)});
	res.redirect("http://localhost:6789/autentificare");
	res.end();
}
});

app.post("/adaugare-produs",(req,res)=>
{
	var produs={id:req.body.IdProdus,numeProdus:req.body.NumeProdus,pret:req.body.PretProdus};

	MongoClient.connect(url,function(err,db)
		{
			if (err) throw err;
			dbo = db.db("mydb");
			dbo.collection("produse").insertOne(produs);
		});
		res.redirect("/admin");
});

app.post("/adaugare_cos",(req,res)=>
{
var aux={IdProdus:req.body.IdProdus};
cos[cos.length]=aux;

if(cos.length==0)
{
sessionstorage.setItem("vectorID",JSON.stringify(cos));
}
else
{
sessionstorage.removeItem("vectorId");
sessionstorage.setItem("vectorID",JSON.stringify(cos));
}
res.redirect("/");
});

app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:`));

function ExistaUtilizator(numeUtilizator,parola)
{
	var admin=false;
	var Exista=false;
	var objJSON=[];
	var data=fs.readFileSync('utilizatori.json','utf8');
	objJSON = JSON.parse(data);
	for(var i=0;i<objJSON.Cont.length;i++)
		{			
		if((numeUtilizator==objJSON.Cont[i].utilizator) && (parola==objJSON.Cont[i].parola))
		{
			Exista=true;
			salveazaInSesiune(objJSON.Cont[i]);
			if(objJSON.Cont[i].tipUser=="admin")
			{
				admin=true;
			}
			break;
		}
		}
		var objAutentificare={ExistaUser:Exista,Admin:admin};
return objAutentificare;
}

function salveazaInSesiune(User)
{
	sessionstorage.setItem("nume",User.nume);
	sessionstorage.setItem("prenume",User.prenume);
}
