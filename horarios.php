<?php 
include_once(__DIR__ . '/conexao.php');
?>

<?php
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "coletapoa";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die("Erro: " . $conn->connect_error);
}

$coleta = $conn->query("SELECT Dia_coleta, Horario_coleta, Tipo_coleta FROM coleta");
$bairros = $conn->query("SELECT Nome_bairro, Zona_cidade FROM bairro");
?>

<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="horarios.css">
    <meta charset="UTF-8">
    <title>Horários e Bairros</title>
</head>
<body>

<table border="0" width="100%">
    <tr>
        <!-- Tabela Coleta -->
        <td valign="top">
            <h3>Horários de Coleta</h3>
            <table border="1">
                <tr>
                    <th>Dia</th>
                    <th>Hora</th>
                    <th>Tipo</th>
                </tr>

                <?php while($c = $coleta->fetch_assoc()) { ?>
                    <tr>
                        <td><?php echo $c["Dia_coleta"]; ?></td>
                        <td><?php echo $c["Horario_coleta"]; ?></td>
                        <td><?php echo $c["Tipo_coleta"]; ?></td>
                    </tr>
                <?php } ?>
            </table>
        </td>

        <td valign="top">
            <h3>Bairros</h3>
            <table border="1">
                <tr>
                    <th>Bairro</th>
                    <th>Zona</th>
                </tr>

                <?php while($b = $bairros->fetch_assoc()) { ?>
                    <tr>
                        <td><?php echo $b["Nome_bairro"]; ?></td>
                        <td><?php echo $b["Zona_cidade"]; ?></td>
                    </tr>
                <?php } ?>
            </table>
        </td>
    </tr>
</table>

</body>
</html>

<?php $conn->close(); ?>
