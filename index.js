const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const MongoClient = require('mongodb').MongoClient;
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const app = express();
const port = 3000;

const url = 'mongodb+srv://eshopadmin:ZhVK3C1OPNemnDAr@clustereshop.smlc4o4.mongodb.net/EShop';
const dbName = 'exceldtb';

const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.static('public'));

// Route để hiển thị template HTML
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/template.html');
});

// Route  để lấy dữ liệu từ Database
app.get('/data', async (req, res) => {
  try {
    const client = await MongoClient.connect(url);
    const db = client.db(dbName);

    const groups = await db.collection('groups').find().toArray();
    const products = await db.collection('products').find().toArray();

    res.json({ groups, products });
  } catch (error) {
    console.log('Lỗi khi lấy dữ liệu', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy dữ liệu' });
  }
});

// Route để import dữ liệu từ file Excel vào Database cho cả hai bảng Group và Product
app.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('Không có file được tải lên.');
  }

  const filePath = req.file.path;
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.readFile(filePath);
    
    // Import dữ liệu cho bảng Group
    const groupWorksheet = workbook.getWorksheet('Group');
    const groupData = [];

    groupWorksheet.eachRow((row, rowIndex) => {
      if (rowIndex !== 1) {
        groupData.push({
          groupID: row.getCell(1).value,
          groupName: row.getCell(2).value,
          title: row.getCell(3).value,
          content: row.getCell(4).value
        });
      }
    });

    // Import dữ liệu cho bảng Product
    const productWorksheet = workbook.getWorksheet('Product');
    const productData = [];

    productWorksheet.eachRow((row, rowIndex) => {
      if (rowIndex !== 1) {
        productData.push({
          groupID: row.getCell(1).value,
          productName: row.getCell(2).value,
          description: row.getCell(3).value
        });
      }
    });

    const client = await MongoClient.connect(url);
    const db = client.db(dbName);

    await db.collection('groups').insertMany(groupData);
    await db.collection('products').insertMany(productData);

    res.send('Dữ liệu của bảng Group và Product đã được import thành công vào Database.');
  } catch (error) {
    console.log('Lỗi khi đọc file', error);
    res.status(500).send('Đã xảy ra lỗi');
  }
});

// Route để export dữ liệu của cả hai bảng Group và Product từ Database ra file Excel
app.get('/export', async (req, res) => {
  try {
    const client = await MongoClient.connect(url);
    const db = client.db(dbName);

    const groups = await db.collection('groups').find().toArray();
    const products = await db.collection('products').find().toArray();

    const workbook = new ExcelJS.Workbook();

    // Tạo worksheet cho bảng Group
    const groupWorksheet = workbook.addWorksheet('Group');
    groupWorksheet.columns = [
      { header: 'Group ID', key: 'groupID', width: 10 },
      { header: 'Group Name', key: 'groupName', width: 20 },
      { header: 'Title', key: 'title', width: 20 },
      { header: 'Content', key: 'content', width: 30 }
    ];
    groups.forEach(group => {
      groupWorksheet.addRow(group);
    });

    // Tạo worksheet cho bảng Product
    const productWorksheet = workbook.addWorksheet('Product');
    productWorksheet.columns = [
      { header: 'Group ID', key: 'groupID', width: 10 },
      { header: 'Product Name', key: 'productName', width: 20 },
      { header: 'Description', key: 'description', width: 30 }
    ];
    products.forEach(product => {
      productWorksheet.addRow(product);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="data.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.log('Lỗi khi xuất file Excel:', error);
    res.status(500).send('Đã xảy ra lỗi khi xuất file Excel.');
  }
});

// Tích hợp Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
