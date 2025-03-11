// import mongoose from 'mongoose';
// import User from '../models/user.js';
// // import ProductCategory from '../models/productCategory.js';

// export const createMongoTransaction = async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     // Create a new User in MongoDB
//     const user = new User({ name: req.body.name, email: req.body.email });
//     await user.save({ session });

//     // Create an Order for the User
//     const order = new Order({
//       user_id: user._id,
//       order_date: new Date(),
//       status: 'Pending',
//       total_amount: req.body.totalAmount,
//     });
//     await order.save({ session });

//     // Create a Product
//     const product = new Product({
//       name: req.body.productName,
//       description: req.body.productDescription,
//       price: req.body.productPrice,
//       stock_quantity: req.body.productStock,
//     });
//     await product.save({ session });

//     // Create a Category
//     const category = new Category({
//       name: req.body.categoryName,
//       description: req.body.categoryDescription,
//     });
//     await category.save({ session });

//     // // Create a Product-Category Relationship
//     // const productCategory = new ProductCategory({
//     //   product_id: product._id,
//     //   category_id: category._id,
//     // });
//     // await productCategory.save({ session });

//     // Commit the transaction if successful
//     await session.commitTransaction();
//     session.endSession();

//     res.status(200).json({ message: 'MongoDB transaction successful' });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     res.status(500).json({ message: 'MongoDB transaction failed', error: error.message });
//   }
// };
