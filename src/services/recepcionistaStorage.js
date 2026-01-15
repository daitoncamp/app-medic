import dataInicial from "../data/recepcionista_data.json";

export function cargarData() {
  const data = localStorage.getItem("recepcionistaData");
  if (!data) {
    localStorage.setItem(
      "recepcionistaData",
      JSON.stringify(dataInicial)
    );
    return dataInicial;
  }
  return JSON.parse(data);
}

export function guardarData(data) {
  localStorage.setItem("recepcionistaData", JSON.stringify(data));
}
