-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 26/11/2025 às 19:44
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
