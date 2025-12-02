<?php

$host = "localhost";
$usuario = "root";
$senha = "";
$banco = "coletapoa";


$conn = new mysqli($host, $usuario, $senha, $banco);

if ($conn->connect_error) {
    die("Falha na conexão: " . $conn->connect_error);
}

$atualizador = date("YmdHis").rand(0,999999999999999);
?>