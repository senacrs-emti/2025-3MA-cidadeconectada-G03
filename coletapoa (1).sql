-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 27/11/2025 às 20:01
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `coletapoa`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `bairro`
--

CREATE TABLE `bairro` (
  `BairroID` int(11) NOT NULL,
  `Nome_bairro` varchar(45) NOT NULL,
  `Zona_cidade` varchar(45) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `bairro`
--

INSERT INTO `bairro` (`BairroID`, `Nome_bairro`, `Zona_cidade`) VALUES
(1, 'Humaita', 'Zona Norte'),
(2, 'Sarandi', 'Zona Norte'),
(3, 'Moinhos de vento', 'Zona Norte'),
(4, 'Passo da areia', 'Zona Norte'),
(5, 'Navegantes', 'Zona Norte'),
(6, 'Farrapos', 'Zona Norte'),
(7, 'Higienopolis', 'Zona Norte'),
(8, 'Jardim Europa', 'Zona Norte'),
(9, 'Centro Historico', 'Zona Central'),
(10, 'Praia de Belas', 'Zona Sul'),
(11, 'Menino Deus', 'Zona Sul'),
(12, 'Teresopolis', 'Zona Sul'),
(13, 'Cavalhada', 'Zona Sul'),
(14, 'Nonoai', 'Zona Sul'),
(15, 'Azenha', 'Zona Sul'),
(16, 'Santa Teresa', 'Zona Sul'),
(17, 'Partenon', 'Zona Leste'),
(18, 'Bom Jesus', 'Zona Leste'),
(19, 'Jardim Carvalho', 'Zona Leste'),
(20, 'Lomba do Pinheiro', 'Zona Leste'),
(21, 'Agronomia', 'Zona Leste'),
(22, 'Morro Santana', 'Zona Leste');

-- --------------------------------------------------------

--
-- Estrutura para tabela `coleta`
--

CREATE TABLE `coleta` (
  `ColetaId` int(11) NOT NULL,
  `Dia_coleta` varchar(45) NOT NULL,
  `Horario_coleta` varchar(45) NOT NULL,
  `Tipo_coleta` varchar(45) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `coleta`
--

INSERT INTO `coleta` (`ColetaId`, `Dia_coleta`, `Horario_coleta`, `Tipo_coleta`) VALUES
(1, 'Quarta e Sexta', '8:00', 'Resido domiciliar'),
(2, 'Segunda e Quinta', '8:00', 'Resido domiciliar'),
(3, 'Segunda, Quarta e Sexta', '18h', 'Resido Domiciliar'),
(4, 'Segunda e Quinta', '8:00', 'Residos domiciliar'),
(5, 'Quartas e Sabados', '8:00', 'Residos domiciliar'),
(6, 'Segundas e Sextas', '8:00', 'Residos domiciliar'),
(7, 'Segundas e Quintas', '8:00', 'Residos domiciliar'),
(8, 'Terças e Sextas', '8:00', 'Residos domiciliar'),
(9, 'Segunda, Quarta e Sexta', '8:00', 'Residos domiciliar'),
(10, 'coleta mecanizada', '8:00', 'Residos domiciliar'),
(11, 'Coleta mecanizada', '18h', 'Residos domiciliar'),
(12, 'Terça e Sabados', '8:00', 'Residos domiciliar'),
(13, 'Segundas e Quartas', '8:00', 'Residos domiciliar'),
(14, 'Terça e Sabado', '8:00', 'Residos domiliar'),
(15, 'Quinta e Sabado', '8:00', 'Residos domiciliar'),
(16, 'Quinta e Sabado', '8:00', 'Residos domiciliar'),
(17, 'Quarta e Sabado', '8:00', 'Residos domiciliar'),
(18, 'Terça e Quinta', '8:00', 'Residos domiciliar'),
(19, 'Terças e Quintas', '8:00', 'Residos domiciliar'),
(20, 'Terças e Quintas', '8:00', 'Residos domiciliar'),
(21, 'Terça e Sabados', '8:00', 'Residos domiliciar'),
(22, 'Quartas e Sexta', '8:00', 'Residos domiciliar');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `bairro`
--
ALTER TABLE `bairro`
  ADD PRIMARY KEY (`BairroID`);

--
-- Índices de tabela `coleta`
--
ALTER TABLE `coleta`
  ADD PRIMARY KEY (`ColetaId`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `bairro`
--
ALTER TABLE `bairro`
  MODIFY `BairroID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
