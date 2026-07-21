function inicializarPedidos(usuario){
    console.log(usuario.pedidos);

    const pedidosDiv = document.getElementById("pedidos");

    if(!pedidosDiv) return;

    pedidosDiv.innerHTML = "";

    if(!usuario.pedidos || usuario.pedidos.length === 0){

        pedidosDiv.innerHTML =
            "<p>Nenhum pedido realizado.</p>";

        return;

    }

    usuario.pedidos.forEach(pedido=>{

        pedidosDiv.innerHTML += `

        <div class="pedido">

            <h4>🥤 ${pedido.produto}</h4>

            <p>📅 ${pedido.data}</p>

            <p>💰 R$ ${pedido.valor}</p>

            <p class="status-entregue">
                🟢 ${pedido.status}
            </p>

        </div>

        `;

    });

}