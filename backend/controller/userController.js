const User = require("../models/user");
const Food = require("../models/food");
const bcrypt = require("bcrypt");
const CODE = require("../modules/statusCode");
const Prefer = require("../models/prefer");
const { Op } = require("sequelize");
const recommend = require("./recommendController");
const { PythonShell } = require("python-shell");
const { SUCCESS } = require("../modules/statusCode");

let options = {
  scriptPath: ".",
};

const user = {
  signup: async (req, res, next) => {
    try {
      const checkId = await User.findOne({
        where: {
          id: req.body.id,
        },
      });
      const checkNickname = await User.findOne({
        where: {
          nickname: req.body.nickname,
        },
      });
      if (checkId) {
        return res.json({
          statusCode: CODE.DUPLICATE,
          msg: "id that already exists",
        });
      }
      if (checkNickname) {
        return res.json({
          statusCode: CODE.DUPLICATE,
          msg: "nickname that already exists",
        });
      }

      const hashedpw = await bcrypt.hash(req.body.password, 12);
      await User.create({
        nickname: req.body.nickname,
        id: req.body.id,
        password: hashedpw,
        sex: req.body.sex,
      });
      return res.json({
        statusCode: CODE.SUCCESS,
        msg: "create user successfully",
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  },
  signin: async (req, res, next) => {
    try {
      const userpassword = req.body.password;
      const userInfo = await User.findOne({
        attributes: ["userid", "password", "nickname"],
        row: true,
        where: {
          id: req.body.id,
        },
      });

      if (!userInfo) {
        return res.json({ statusCode: CODE.FAIL, msg: "signin fail" });
      } else {
        const isEqualPw = await bcrypt.compare(userpassword, userInfo.password);

        if (isEqualPw) {
          let userData = {
            userid: userInfo.userid,
            nickname: userInfo.nickname,
          };
          return res.json({
            statusCode: CODE.SUCCESS,
            msg: "login success",
            result: userData,
          });
        } else {
          return res.json({ statusCode: CODE.FAIL, msg: "signin fail" });
        }
      }
    } catch (error) {
      console.error(error);
      return res.json({ statusCode: CODE.SERVER_ERROR, msg: "server error" });
    }
  },
  getMade: async (req, res, err) => {
    try {
      const userMade = await Prefer.findAll({
        attributes: ["foodid"],
        raw: true,
        where: {
          userid: req.query.userid,
          made: true,
        },
      });
      let foodarr = [];
      for (let i = 0; i < userMade.length; i++) {
        foodarr.push(userMade[i].foodid);
      }
      console.log(foodarr);
      const foodData = await Food.findAll({
        attributes: ["Name", "Image", "foodid"],
        raw: true,
        where: {
          foodid: { [Op.in]: foodarr },
        },
      });
      return res.json({
        statusCode: CODE.SUCCESS,
        msg: "???????????? ????????? ??????????????????.",
        result: foodData,
      });
    } catch (err) {
      console.error(err);
      return res.json({ statusCode: CODE.FAIL, msg: "?????????????????? ??????" });
    }
  },
  getLike: async (req, res, err) => {
    try {
      const userLike = await Prefer.findAll({
        attributes: ["foodid"],
        raw: true,
        where: {
          userid: req.query.userid,
          favorite: true,
        },
      });
      let foodarr = [];
      for (let i = 0; i < userLike.length; i++) {
        foodarr.push(userLike[i].foodid);
      }
      const foodData = await Food.findAll({
        attributes: ["Name", "Image", "foodid"],
        raw: true,
        where: {
          foodid: { [Op.in]: foodarr },
        },
      });
      return res.json({
        statusCode: CODE.SUCCESS,
        msg: "?????? ????????? ????????? ?????? ????????? ??????????????????.",
        result: foodData,
      });
    } catch (err) {
      console.error(err);
      return res.json({ statusCode: CODE.FAIL, msg: "?????????????????? ??????" });
    }
  },
  updateLike: async (req, res, err) => {
    try {
      const updateUser = await Prefer.update(
        {
          favorite: req.body.favorite,
        },
        {
          where: {
            userid: req.body.userid,
            foodid: req.body.foodid,
          },
        }
      );
      await recommend.write();
      PythonShell.run("./py/recommend.py", options, async function (err, data) {
        if (err) console.error(err);
        console.log(data);
      });
      if (updateUser) {
        return res.json({
          statusCode: CODE.SUCCESS,
          msg: "???????????? ???????????????????????????.",
        });
      } else {
        return res.json({
          statusCode: CODE.FAIL,
          msg: "???????????? ?????? ???????????? ????????????.",
        });
      }
    } catch (err) {
      console.error(err);
      return res.json({ statusCode: CODE.FAIL, msg: "db ??????" });
    }
  },
  updateMade: async (req, res, err) => {
    try {
      const deleteFood = await Prefer.update(
        {
          made: req.body.made,
        },
        {
          where: {
            userid: req.body.userid,
            foodid: req.body.foodid,
          },
        }
      );
      await recommend.write();
      PythonShell.run("./py/recommend.py", options, async function (err, data) {
        if (err) console.error(err);
        console.log(data);
      });
      if (deleteFood) {
        const firstData = spawn("python3", ["./py/recommend.py"]);
        firstData.stderr.on("data", function (data) {
          console.error("stderr", data.toString());
        });
        return res.json({
          statusCOde: CODE.SUCCESS,
          msg: "???????????? ????????? ???????????????????????????.",
        });
      } else {
        return (
          res,
          json({
            statusCode: CODE.FAIL,
            msg: "?????? ????????? ????????? ????????? ????????????????????? ????????????.",
          })
        );
      }
    } catch (error) {
      console.error(error);
      return res.json({ statusCode: CODE.FAIL, msg: "db ??????" });
    }
  },
  delete: async (req, res) => {
    try {
      const userid = req.query.userid;
      const deleteFlag = await User.destroy({
        where: {
          userid: userid,
        },
      });
      if (!deleteFlag)
        return res.json({
          statusCode: CODE.FAIL,
          msg: "?????? ????????? ?????? ??? ????????????.",
        });
      return res.json({
        statusCode: CODE.SUCCESS,
        msg: "?????? ????????? ?????????????????????.",
      });
    } catch (error) {
      console.error(error);
      return res.json({ statusCode: CODE.FAIL, msg: "db ??????" });
    }
  },
};

module.exports = user;
