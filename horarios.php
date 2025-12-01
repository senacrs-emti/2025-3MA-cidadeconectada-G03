<?php

$conn = new mysqli("localhost", "root", "", "coletapoa");
include_once(__DIR__ . '/includes/conexao.php');

if ($conn->connect_error) {
    die("Erro na conexão: " . $conn->connect_error);
}


$sql = "
    SELECT 
        bairro.Nome_bairro,
        bairro.Zona_cidade,
        coleta.Horario_coleta,
        coleta.Tipo_coleta
    FROM bairro
    INNER JOIN coleta ON bairro.BairroID = coleta.ColetaID
";

$result = $conn->query($sql);


echo "<table border='1' cellpadding='8' cellspacing='0'>
        <tr>
            <th>Bairro</th>
            <th>Zona</th>
            <th>Horário</th>
            <th>Tipo da Coleta</th>
        </tr>";

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        echo "<tr>
                <td>".$row['Nome_bairro']."</td>
                <td>".$row['Zona_cidade']."</td>
                <td>".$row['Horario_coleta']."</td>
                <td>".$row['Tipo_coleta']."</td>
              </tr>";
    }
}

echo "</table>";

$conn->close();
?>
