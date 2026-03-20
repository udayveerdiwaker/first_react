<?php
$conn = new mysqli("localhost", "root", "", "react_auth");

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>