const mysql = require('mysql');
const express= require('express');
const session = require('express-session');
const path = require('path');
const app = express();
const validator =  require("validar-telefone");

//faz a conexao com o banco de dados
const connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'clinica_oasis'
});

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname + 'public/img')))
app.use('/css', express.static(path.join(__dirname + 'public/css')))
app.set("views", path.join(__dirname, "/views"));
app.set('view engine', 'ejs')


//------------home page -----------------//

// http://localhost:5500/home
app.get('/home', function(request, response){
	// Render login template
	response.render('pages/index.ejs')
});

//-----------log pages ----------------//

// http://localhost:5500/login
app.get('/login', function(request, response){
	response.render('pages/login.ejs')
});

app.get('/loginagain', function(request,response){
	response.redirect('/login')
});

//-------------cadastro page --------------------//

// http://localhost:5500/cadastro
app.get('/cadastro', function(request, response){
	response.render('pages/cadastro.ejs')
});

//-------recuperacao de senha pages ---------//

app.get('/recsenha1', function(request, response){
	response.render('pages/recsenha-1.ejs')
});
app.get('/recsenha2', function(request, response){
	response.render('pages/recsenha-2.ejs')
});
app.get('/alter', function(request, response){
	response.render('pages/alterconfirm.ejs')
});
//----------alter success page ---------//

app.get('/success', function(request, response){
	response.render('pages/altersucces.ejs')
});
//-------------login--------------//

// http://localhost:5500/auth
app.post('/auth', function(request, response){
	//faz a requisição dos campos inseridos no html
	let email = request.body.email;
	let password = request.body.password;
	
	// tem certeza que o usuario colocou informações nos campos de login
	if (email && password) {
		//faz a busca no banco de dados para ver se o usuario possui um cadastro feito
		connection.query('SELECT * FROM accounts WHERE email = ? AND password = MD5(?)', [email, password], function(error, results, fields) {
			// se tiver algun problema com a query, mostrar o erro
			if (error) throw error;
			//se a conta existe
			if (results.length > 0) {
				// autentica o usuario
				// console.log(results)
				request.session.loggedin = true;
				request.session.email = email;
				let id = results[0].id;
				// rerediciona para a home page
				response.redirect(`/signed`);
			} else {
				response.render('pages/credencial')
			}			
			response.end();
		});
	} else {
		response.send('Please enter Username and Password!');
		response.end();
	}
});

// http://localhost:5500/signed
app.get('/signed', function(request, response) {
	//se o usuario esta logado 
	if (request.session.loggedin) {
		//faz a requisicao do email da sessao para estar logado
		let email = request.session.email;
		let sql = "SELECT * FROM clinica_oasis.accounts WHERE email = ?"
		connection.query(sql, [email], function (error, results){
			let usuario = results[0] ;
			response.render('pages/logado',{usuario:usuario});
			
		})
		
	} else {
		// 	// Nao esta logado
		response.redirect('/login');
	}
	
});

app.get("/agenda", function (request, response) {
	//se o usuario esta logado
	if (request.session.loggedin) {
	  //faz a requisicao do email da sessao para estar logado
	  let email = request.session.email;
	  let sql = "SELECT id_client FROM clinica_oasis.accounts WHERE email = ?";
	  connection.query(sql, [email], function (err, results) {
		let user = results[0];
		if (err) throw err;
		if (results) {
		  let schedules =
			"SELECT * FROM clinica_oasis.scheduling WHERE id_client = ? ";
		  connection.query(schedules, [user], function (err, results) {
			let schedue = (results);
			// response.render('pages/agendamentos.ejs', {schedue:schedue});
			console.log(schedue)
		  });
		}
	  });
	} else {
	  // 	// Nao esta logado
	  response.redirect("/login");
	}
  });

//-----------------cadastro-----------------//

// http://localhost:5500/register
app.post("/register", function register(request, response){
	
	//faz a requisição vinda do body do html para realizar o cadastro
	const { name } = request.body;
	const { birthday } = request.body;
	const { wpp } = request.body;  
	const { email } = request.body;
	const { password } = request.body;

	let emailtest = "SELECT * FROM clinica_oasis.accounts WHERE email = ?"

	connection.query(emailtest, [email], (err, results) => {
	if(results==0){
		//variavel para realizar o comando MySQL
		let SQL = "INSERT INTO clinica_oasis.accounts(name, birthday, wpp, email, password) VALUES ( ?, ?, ?, ?, MD5(?))";
		
		connection.query(SQL, [name, birthday, wpp, email, password], (err, results) => {
			if (err) {
				response.redirect('/home')
			}
			
			if (results) {
				request.session.loggedin = true;
				request.session.email = email;
				response.redirect('/signed')
			}
			
		})
	}
	if(results>0){
		console.log("email ja registrado")
	}
	if(err){
		console.log("erro nao identificado")
	}
	})
	
})

//-----------------logout---------------//

app.get('/logout', function(request,response){
	request.session.destroy();
	response.redirect('/login');
});

//-------recuperação de senha-----------//

app.post('/recsenha_1', function(request, response){
	//faz a requisição vinda do body do html para fazer a recuperação de senha
	const { wpp } = request.body;  
	const { email } = request.body;
		//variavel para realizar o comando MySQL
	let senha = "SELECT * FROM clinica_oasis.accounts WHERE email = ? and wpp = ?"
	connection.query(senha, [email, wpp], (err, results) => {
		if(err){
			response.redirect('/recsenha')
		}
		if(results){
			request.session.email = email
			response.redirect('/recsenha2')
		}
	})
})

app.post('/recsenha_2', function(request, response){
	//faz a requisição vinda do body do html para saber qual a senha que sera inserida
	const { password } = request.body;
	//faz a requisicao do email da sessao para estar logado
	let email = request.session.email;
	//variavel para realizar o comando MySQL
	let senha = "UPDATE accounts SET password = MD5(?) WHERE email = ?"
	connection.query( senha, [password, email], (err, results) => {
		if(err){
			response.redirect('/recsenha1')
		}
		if(results){
			response.redirect('/signed')
		}
	})
})

//-------alteracao de dados--------------//


app.get('/signed/alterdata', function(request, response){
	if (request.session.loggedin) {
		//faz a requisicao do email da sessao para estar logado
		let email = request.session.email;
			//variavel para realizar o comando MySQL
		let sql = "SELECT * FROM clinica_oasis.accounts WHERE email = ?"
		connection.query(sql, [email], function (error, results){
			let usuario = results[0] 
			response.render('pages/alterdata', {usuario:usuario});
		})
		
	} else {
		// 	// Nao esta logado
		response.redirect('/login');
	}
});

app.post('/alternome', function(request, response){
	//faz a requisição vinda do body do html para alterar o nome
	const { nome } = request.body;
	//faz a requisicao do email da sessao para estar logado
	let email = request.session.email;
		//variavel para realizar o comando MySQL
	let senha = "UPDATE accounts SET nome = ? WHERE email = ?"
	connection.query( senha, [nome, email], (err, results) => {
		if(err){
			response.redirect('/signed/alterdata')
		}
		if(results){
			response.redirect('/success')
		}
	})
})

app.post('/alterwpp', function(request, response){
	//faz a requisição vinda do body do html para alterar o whatsapp
	const { wpp } = request.body;
	//faz a requisicao do email da sessao para estar logado
	let email = request.session.email;
		//variavel para realizar o comando MySQL
	let senha = "UPDATE accounts SET wpp = ? WHERE email = ?"
	connection.query( senha, [wpp, email], (err, results) => {
		if(err){
			response.redirect('/signed/alterdata')
		}
		if(results){
			response.redirect('/success')
		}
	})
})
app.post('/alterpassword', function(request, response){
	//faz a requisição vinda do body do html para alterar a senha ja estando logado
	const { password } = request.body;
	//faz a requisicao do email da sessao para estar logado
	let email = request.session.email;
	//variavel para realizar o comando MySQL
	let senha = "UPDATE accounts SET password = MD5(?) WHERE email = ?"
	connection.query( senha, [password, email], (err, results) => {
		if(err){
			response.redirect('/signed/alterdata')
		}
		if(results){
			response.redirect('/success')
		}
	})
})

// app.post("/scheduling", function (request, response) {
// 	if (request.session.loggedin) {
// 	  //faz a requisicao do email da sessao para estar logado
// 	  let email = request.session.email;
// 	  //variavel para realizar o comando MySQL
// 	  let sql = "SELECT id_client FROM clinica_oasis.accounts WHERE email = ?";
// 	  connection.query(sql, [email], function (err, results) {
// 		if (err) {
// 		  response.redirect("/signed");
// 		}
// 		if (results) {
// 		  const { time } = request.body;
// 		  const { date } = request.body;
// 		  const { professional } = request.body;
// 		  const { proceedings } = request.body;
// 		  const { id_client } = results[0];
  
// 		  let sqldate = "SELECT * FROM clinica_oasis.scheduling WHERE time = ? and date = ? and professional = ? and proceedings = ? ";
  
// 			  connection.query(sqldate, [time, date, professional, proceedings], (err, results) => {
// 				if (err) {
// 				  response.redirect("/signed");
// 				}
// 				if (results.length > 1) {
// 				  console.log("ja existe agendamento");
// 				} else {
// 				  let sqlmark ="INSERT INTO clinica_oasis.scheduling (time, date, professional, proceedings, id_client) VALUES(?, ?, ?, ?, ?)";
// 				  connection.query(sqlmark,[time, date, professional,
// 					proceedings, id_client],(err, results) => {
// 					  if (err) {
// 						console.log("não foi agendado");
// 					  }
// 					  if (results) {
// 						console.log("atendimento agendado");
// 					  }
// 					}
// 				  );
// 				}
// 			  });
// 			}
// 		  });
// 		} else {
// 		  // 	// Nao esta logado
// 		  response.redirect("/login");
// 		}
// 	  });
  



//porta onde esta o servidor
app.listen(5500);