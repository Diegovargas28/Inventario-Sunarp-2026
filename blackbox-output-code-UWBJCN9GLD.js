document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const loadBtn = document.getElementById('loadBtn');
    const exportBtn = document.getElementById('exportBtn');
    const warningsDiv = document.getElementById('warnings');
    const table = document.getElementById('inventoryTable');
    const tableBody = document.getElementById('tableBody');
    const pagination = document.getElementById('pagination');
    const paginationList = document.getElementById('paginationList');
    const searchInput = document.getElementById('searchInput');
    const codigoSearch = document.getElementById('codigoSearch');
    const ubicacionSearch = document.getElementById('ubicacionSearch');
    const usuarioSearch = document.getElementById('usuarioSearch');

    let inventoryData = [];
    let filteredData = [];
    let currentPage = 1;
    const itemsPerPage = 30;
    const expectedHeaders = ['codigo_patrimonial', 'responsable', 'usuario', 'descripcion', 'ubicac_fisica', 'marca', 'modelo', 'nro_serie', 'estado'];

    // Función para normalizar encabezados (minúsculas, sin acentos, espacios a guiones bajos)
    function normalizeHeader(header) {
        return header.toLowerCase()
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
            .replace(/\s+/g, '_'); // Espacios a guiones bajos
    }

    // Cargar datos desde localStorage al iniciar
    loadFromLocalStorage();

    loadBtn.addEventListener('click', loadInventory);
    exportBtn.addEventListener('click', exportToExcel);
    searchInput.addEventListener('input', filterData);
    codigoSearch.addEventListener('input', filterData);
    ubicacionSearch.addEventListener('input', filterData);
    usuarioSearch.addEventListener('input', filterData);

    function loadInventory() {
        const file = fileInput.files[0];
        if (!file) {
            alert('Por favor, selecciona un archivo Excel.');
            return;
        }
        if (!file.name.endsWith('.xlsx')) {
            alert('El archivo debe ser un .xlsx válido.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});

                console.log('Datos crudos del Excel:', jsonData); // Para depuración

                if (jsonData.length < 2) {
                    throw new Error('El archivo no contiene datos suficientes.');
                }

                const rawHeaders = jsonData[0];
                const normalizedHeaders = rawHeaders.map(normalizeHeader);
                console.log('Encabezados normalizados:', normalizedHeaders); // Para depuración

                const detectedHeaders = expectedHeaders.filter(h => normalizedHeaders.includes(h));
                const missingHeaders = expectedHeaders.filter(h => !normalizedHeaders.includes(h));

                console.log('Encabezados detectados:', detectedHeaders); // Para depuración
                console.log('Encabezados faltantes:', missingHeaders); // Para depuración

                if (missingHeaders.length > 0) {
                    warningsDiv.innerHTML = `Advertencia: Los siguientes encabezados no se encontraron (después de normalización): ${missingHeaders.join(', ')}. Se extraerán solo los disponibles.`;
                    warningsDiv.style.display = 'block';
                } else {
                    warningsDiv.style.display = 'none';
                }

                inventoryData = jsonData.slice(1).map(row => {
                    const item = {};
                    detectedHeaders.forEach(header => {
                        const headerIndex = normalizedHeaders.indexOf(header);
                        item[header] = row[headerIndex] || '';
                    });
                    return item;
                });

                console.log('Datos extraídos:', inventoryData); // Para depuración

                filteredData = [...inventoryData];
                saveToLocalStorage();
                renderTable();
                exportBtn.disabled = false;
            } catch (error) {
                alert('Error al procesar el archivo: ' + error.message);
                console.error('Error detallado:', error); // Para depuración
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // Resto del código permanece igual...
    function renderTable() {
        tableBody.innerHTML = '';
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageData = filteredData.slice(start, end);

        pageData.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.codigo_patrimonial || ''}</td>
                <td>${item.responsable || ''}</td>
                <td>${item.usuario || ''}</td>
                <td>${item.descripcion || ''}</td>
                <td>${item.ubicac_fisica || ''}</td>
                <td>${item.marca || ''}</td>
                <td>${item.modelo || ''}</td>
                <td>${item.nro_serie || ''}</td>
                <td>${item.estado || ''}</td>
                <td><button class="btn btn-sm btn-warning btn-edit" data-index="${start + index}">Editar</button></td>
            `;
            tableBody.appendChild(row);
        });

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', editItem);
        });

        renderPagination();
        table.style.display = 'table';
        pagination.style.display = 'block';
    }

    function renderPagination() {
        paginationList.innerHTML = '';
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement('li');
            li.className = 'page-item' + (i === currentPage ? ' active' : '');
            li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
            paginationList.appendChild(li);
        }
        document.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage = parseInt(e.target.dataset.page);
                renderTable();
            });
        });
    }

    function filterData() {
        const generalSearch = searchInput.value.toLowerCase();
        const codigo = codigoSearch.value.toLowerCase();
        const ubicacion = ubicacionSearch.value.toLowerCase();
        const usuario = usuarioSearch.value.toLowerCase();

        filteredData = inventoryData.filter(item => {
            const matchesGeneral = !generalSearch || Object.values(item).some(val => val.toLowerCase().includes(generalSearch));
            const matchesCodigo = !codigo || (item.codigo_patrimonial && item.codigo_patrimonial.toLowerCase().includes(codigo));
            const matchesUbicacion = !ubicacion || (item.ubicac_fisica && item.ubicac_fisica.toLowerCase().includes(ubicacion));
            const matchesUsuario = !usuario || (item.usuario && item.usuario.toLowerCase().includes(usuario));
            return matchesGeneral && matchesCodigo && matchesUbicacion && matchesUsuario;
        });
        currentPage = 1;
        renderTable();
    }

    function editItem(e) {
        const index = parseInt(e.target.dataset.index);
        const item = filteredData[index];
        // Implementar edición inline o modal aquí (simplificado para este ejemplo)
        const newValue = prompt('Editar descripción:', item.descripcion);
        if (newValue !== null) {
            item.descripcion = newValue;
            saveToLocalStorage();
            renderTable();
        }
    }

    function exportToExcel() {
        const ws = XLSX.utils.json_to_sheet(inventoryData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
        XLSX.writeFile(wb, 'inventario_sunarp_2026.xlsx');
    }

    function saveToLocalStorage() {
        localStorage.setItem('sunarpInventory', JSON.stringify(inventoryData));
    }

    function loadFromLocalStorage() {
        const saved = localStorage.getItem('sunarpInventory');
        if (saved) {
            inventoryData = JSON.parse(saved);
            filteredData = [...inventoryData];
            renderTable();
            exportBtn.disabled = false;
        }
    }
});